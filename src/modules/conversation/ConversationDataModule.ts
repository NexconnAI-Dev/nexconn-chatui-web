import {
  MessageDirection, ChannelNoDisturbLevel, DirectChannel, MessageType,
  NCResult,
  ChannelIdentifier,
  MessageReadReceiptInfo,
  MessageIdentifier,
  ChannelType,
  BaseChannel,
  NCEngine,
  MessageReceiptResponseEvent,
  MessageHandler,
  MessageReadReceiptResponse,
  ChannelHandler,
  ChannelUnreadStatusSyncEvent,
  MentionedType,
  ChannelPinnedSyncEvent,
  ChannelNoDisturbLevelSyncEvent,
  GroupChannelIdentifier,
  DirectChannelIdentifier,
  SystemChannelIdentifier,
  ChannelsSyncCompleteEvent,
  ChannelHandlerParams,
  MessageHandlerParams,
  ChannelsQuery,
} from '@nexconn/chat';
import { createNexconnChannel, getServerTime } from '@lib/helper';

import { ChatUIModule } from '../ChatUIModule';
import { ChatUICommand } from '../../enums/ChatUICommand';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { LogTag } from '../../enums/LogTag';
import { trans2ChannelKey } from '../../helper';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { NCChatUICode } from '../../enums/NCChatUICode';
import { MessagesDeletedEvent, GroupProfilesUpdateEvent, DeleteMessageData, InnerEvent, InsertNewMessagesEvent, MessageStateChangeEvent, ChatUIEvents, RecvNewMessagesEvent, SystemProfilesUpdateEvent, UserProfilesUpdateEvent } from '@lib/core/EventDefined';
import { ChatUIMentionedType } from '../../enums/ChatUIMentionedType';
import { ChatUIChannelModel } from '../../models/NCUIChannelModel';
import type { LanguagePackEntries } from '../../languages';

/** Prompt the user to check the network for this IMLib code, as specified by the SDK. */
const IMLIB_ALERT_CHECK_NETWORK_CODE = 30002;

/**
 * Channel list data module.
 * @description
 * Channel list loading and update flow:
 * 1. Load the full channel list during initialization. Queue messages received during loading
 *    (Electron only) and channel events until loading completes.
 * 2. After loading, process messages first (Electron only), then channel events.
 */
export class ChannelDataModule extends ChatUIModule {
  /** Full channel list, ordered to match the UI. */
  private _channelList: ChatUIChannelModel[] = [];

  // Pending message queue.
  private _messageQueue: ChatUIMessageModel[] = [];

  /** Pending channel notification queue. */
  private _converNtfQueue: Array<ChannelPinnedSyncEvent | ChannelNoDisturbLevelSyncEvent> = [];

  /**
   * Cached channel object pool that prevents duplicate instances across pinned and regular lists.
   */
  private _pool: Map<string, ChatUIChannelModel> = new Map();

  /** Delayed retry timer for failed remote channel list requests. */
  private _getRemoteChannelsTimer: any = null;

  /** Whether offline message loading is complete. */
  private _pullOfflineMessageFinished: boolean = false;

  #_rrV5Map: Map<string, MessageReadReceiptInfo> = new Map();

  /**
   * Open channel.
   */
  private _openedChannelModel: ChatUIChannelModel | null = null;

  public getOpenedChannelModel(): ChatUIChannelModel | null {
    return this._openedChannelModel;
  }

  public setOpenedChannel(model: ChatUIChannelModel | null, focusInput: boolean = true): void {
    this._setOpenedChannel(model, focusInput);
  }

  /**
   * Create a cached channel object or return the existing one.
   */
  private _createCachedChannel(channelIdentifier: ChannelIdentifier): ChatUIChannelModel {
    const key = trans2ChannelKey(channelIdentifier);
    if (this._pool.has(key)) {
      return this._pool.get(key)!;
    }
    const cached = new ChatUIChannelModel(channelIdentifier);
    this._pool.set(key, cached);
    return cached;
  }

  protected _onInit(): void {
    this.ctx.addEventListener(InnerEvent.USER_PROFILES_UPDATE, this._onUserProfilesUpdate, this);
    this.ctx.addEventListener(InnerEvent.GROUP_PROFILES_UPDATE, this._onGroupProfilesUpdate, this);
    this.ctx.addEventListener(InnerEvent.SYSTEM_PROFILES_UPDATE, this._onSystemProfilesUpdate, this);

    this.ctx.addEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages, this);
    this.ctx.addEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages, this);
    this.ctx.addEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange, this);
    this.ctx.addEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages, this);

    const messageHandlerParams: MessageHandlerParams = {
      onMessageReceiptResponse: (event) => this._onV5ReceiptResponse(event),
      onOfflineMessageSyncCompleted: (event) => this._pullOfflineMessageFinished = true,
    }
    const channelHandlerParams: ChannelHandlerParams = {
      onChannelUnreadStatusSync: (event) => this._onSyncReadStatus(event),
      onChannelPinnedSync: (event) => this._onChannelPinnedSync(event),
      onChannelNoDisturbLevelSync: (event) => this._onChannelNoDisturbLevelSync(event),
      onChannelsSyncComplete: (event) => this._onChannelsSyncCompleted(event),
    }

    NCEngine.addMessageHandler('channels-data-module', new MessageHandler(messageHandlerParams));
    NCEngine.addChannelHandler('channels-data-module', new ChannelHandler(channelHandlerParams));
  }

  protected _onInitUserCache(): void {
    this._getMoreRemoteChannels(true)
  }

  protected _onDestroyUserCache(): void {
    // Clear in-memory data when the signed-in user changes.
    this._channelList.length = 0;
    this._pool.clear();
    this._openedChannelModel = null;
    this._getRemoteChannelsFinished = false;
    this._pullOfflineMessageFinished = false;

    if (this._getRemoteChannelsTimer) {
      clearTimeout(this._getRemoteChannelsTimer);
      this._getRemoteChannelsTimer = null;
    }

    this._clearTypingStatus();
  }

  public destroy(): void {
    this._onDestroyUserCache();
    this.ctx.removeEventListener(InnerEvent.USER_PROFILES_UPDATE, this._onUserProfilesUpdate, this);
    this.ctx.removeEventListener(InnerEvent.GROUP_PROFILES_UPDATE, this._onGroupProfilesUpdate, this);
    this.ctx.removeEventListener(InnerEvent.SYSTEM_PROFILES_UPDATE, this._onSystemProfilesUpdate, this);

    this.ctx.removeEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages, this);
    this.ctx.removeEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages, this);
    this.ctx.removeEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange, this);
    this.ctx.removeEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages, this);

    NCEngine.removeMessageHandler('channels-data-module');
    NCEngine.removeChannelHandler('channels-data-module');
  }

  private async _onDeleteMessages(evt: MessagesDeletedEvent) {
    const list: DeleteMessageData[] = evt.data;

    // Messages deleted or recalled in one batch belong to one channel and are chronological, so use the last one.
    const { channelIdentifier, transactionId, messageId } = list[list.length - 1]!;
    const cached = this._pool.get(trans2ChannelKey(channelIdentifier));
    if (!cached) {
      return;
    }

    let changed = false;
    const latestMessage = cached.latestMessage;
    if (latestMessage
      && (
        (latestMessage.transactionId && latestMessage.transactionId === transactionId)
        || (latestMessage.messageId && latestMessage.messageId === messageId)
      )
    ) {
      // Update the channel's latest message.
      // TODO: Consider assigning the last cached message to latestMessage to avoid null.
      cached.latestMessage = this.ctx.message.getLatestMessage(cached.channelIdentifier);
      changed = true;
    }
    if (cached.unreadCount > 0) {
      cached.unreadCount -= 1;
      changed = true;
    }
    if (changed) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, [cached]));
    }
  }

  /**
   * Handle locally inserted message timestamps, which may reorder the channel list.
   * Create a missing channel, or update the order and latest message of an existing channel.
   * Inserted messages usually belong to one channel, allowing optimized handling.
   * @param evt
   */
  private async _onInsertNewMessages(evt: InsertNewMessagesEvent) {
    this._handlerMessageModel(evt.data);
  }

  private _handlerMessageModel(messages: ChatUIMessageModel[]): void {
    // Do not use pop because the UI and other modules also consume this event.
    const message = messages[messages.length - 1];
    const key = trans2ChannelKey(message.channelIdentifier);
    let model = this._pool.get(key);

    if (!model) {
      const channel = createNexconnChannel(message.channelIdentifier)!;
      model = this._parseChannelList([channel])[0]!;
    }
    model.latestMessage = message;
    model.updateTime = message.sentTime;

    this._recalculatePosition(new Set([model]));
  }

  /**
   * Handle sending state and file upload progress events. State changes do not affect list order.
   * @param evt
   */
  private _onMessageStateChange(evt: MessageStateChangeEvent): void {
    const messages = evt.data;
    const changed: ChatUIChannelModel[] = [];
    messages.forEach((item) => {
      const key = trans2ChannelKey(item.channelIdentifier);
      const model = this._pool.get(key);
      if (!model) {
        // Ignore missing cached channels, which may have been deleted before sending completed.
        return;
      }

      // Ignore messages that are not the channel's latest message.
      if (model.latestMessage && (model.latestMessage.transactionId === item.transactionId || model.latestMessage.messageId == item.messageId)) {
        model.latestMessage = item;
        changed.push(model);
      }
    });

    if (changed.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, changed));
    }
  }

  protected _getMentionedType(userId: string, mentionedInfo?: { userIdList: string[], type: MentionedType }) {
    if (!mentionedInfo) {
      return ChatUIMentionedType.NONE;
    }
    const { type, userIdList } = mentionedInfo;
    if (type === MentionedType.ALL) {
      return ChatUIMentionedType.AT_ALL;
    }

    if (!userIdList || !Array.isArray(userIdList)) {
      return ChatUIMentionedType.NONE;
    }

    return userIdList.includes(userId) ? ChatUIMentionedType.AT_ME : ChatUIMentionedType.NONE;
  }

  private _onUserProfilesUpdate(e: UserProfilesUpdateEvent): void {
    const changed: ChatUIChannelModel[] = [];
    e.data.forEach((item) => {
      const channelIdentifier = new DirectChannelIdentifier(item.userId);
      const model = this._pool.get(trans2ChannelKey(channelIdentifier));
      if (!model) {
        return;
      };
      if (model.name !== item.name || model.avatarUrl !== item.avatarUrl || model.online !== item.online) {
        model.name = item.name;
        model.avatarUrl = item.avatarUrl;
        model.online = item.online;
        changed.push(model);
      }
    })

    if (changed.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, changed));
    }
  }

  private _onSystemProfilesUpdate(evt: SystemProfilesUpdateEvent): void {
    const changed: ChatUIChannelModel[] = [];
    evt.data.forEach((item) => {
      const channelIdentifier = new SystemChannelIdentifier(item.systemId);
      const model = this._pool.get(trans2ChannelKey(channelIdentifier));
      if (!model) {
        return;
      };
      if (model.name !== item.name || model.avatarUrl !== item.avatarUrl) {
        model.name = item.name;
        model.avatarUrl = item.avatarUrl;
        changed.push(model);
      }
    })

    if (changed.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, changed));
    }
  }

  private _onGroupProfilesUpdate(e: GroupProfilesUpdateEvent): void {
    const profiles = e.data;
    const changed: ChatUIChannelModel[] = [];
    profiles.forEach((item) => {
      const channelIdentifier = new GroupChannelIdentifier(item.groupId);
      const model = this._pool.get(trans2ChannelKey(channelIdentifier));
      if (!model) {
        return;
      }

      // Channel data uses only the group name, avatar, and member count.
      if (model.name !== item.name || model.avatarUrl !== item.avatarUrl || model.memberCount !== item.memberCount) {
        model.name = item.name;
        model.avatarUrl = item.avatarUrl;
        model.memberCount = item.memberCount;
        changed.push(model);
      }
    });

    if (changed.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, changed));
    }
  }

  /**
   * Update the sending state of a group channel's latestMessage.
   */
  updateLatesMessageStatus(list: ChatUIChannelModel[]): void {
    if (!list || list.length <= 0) return
    if (this.ctx.isReadReceiptV5) {
      // V5 behavior: read data is handled through kitReadReceiptInfo.
      const privateList = list.filter((item) => item.channelType === ChannelType.DIRECT && item.latestMessage && item.latestMessage.senderUserId === this.ctx.userId);
      this._handleLatestReadReceiptInfoV5(privateList);
    }
  }

  private _onChannelPinnedSync = (event: ChannelPinnedSyncEvent) => {
    this._converNtfQueue.push(event);
    this._handleQueue();
  }

  private _onChannelNoDisturbLevelSync = (event: ChannelNoDisturbLevelSyncEvent) => {
    this._converNtfQueue.push(event);
    this._handleQueue();
  }

  private _onChannelsSyncCompleted = (event: ChannelsSyncCompleteEvent) => {
    this._getMoreRemoteChannels(false)
  }

  /**
   * Handle unread count synchronization across clients.
   */
  private _onSyncReadStatus = async ({ channelIdentifier }: ChannelUnreadStatusSyncEvent): Promise<void> => {
    const key = trans2ChannelKey(channelIdentifier);
    let cached = this._pool.get(key);
    if (!cached) {
      return;
    }
    let channel = createNexconnChannel(channelIdentifier);
    if (!channel) {
      return;
    }
    const { isOk, data } = await channel.reload();
    if (!isOk) {
      return;
    }

    const unreadCount = data!.unreadCount;

    if (cached.unreadCount !== unreadCount) {
      cached.mentionedType = ChatUIMentionedType.NONE;
      cached.unreadCount = unreadCount;
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, [cached]));
    }
  }

  /**
   * Handle a channel notification and return the updated cached channel.
   * @returns - changeType: 0 for no change, 1 for state-only change, 2 for position change.
   */
  private _handleChannelNtf(
    item: ChannelPinnedSyncEvent | ChannelNoDisturbLevelSyncEvent
  ): { changeType: number, model?: ChatUIChannelModel } {
    const { channelIdentifier } = item;
    const key = trans2ChannelKey(channelIdentifier);
    // Get the cached channel.
    let model = this._pool.get(key);
    let changeType = 0;
    if (model) {
        // Handle pinned state.
      if ('isPinned' in item) {
        model.isPinned = item.isPinned;
        changeType = Math.max(2, changeType);
      }
      if ('level' in item) {
        model.noDisturbLevel = item.level;
        changeType = Math.max(1, changeType);
      }
      return this._handleUpdatedItems(model, item);
    }
    return { changeType };
  }

  private _handleUpdatedItems(
    model: ChatUIChannelModel,
    item: ChannelPinnedSyncEvent | ChannelNoDisturbLevelSyncEvent
  ): { changeType: number, model: ChatUIChannelModel } {
    let changeType = 0;
    const { channelIdentifier } = item;
    // Handle pinned state.
    if ('isPinned' in item) {
      model.isPinned = item.isPinned;
      changeType = Math.max(2, changeType);
    }
    if ('level' in item) {
      model.noDisturbLevel = item.level;
      changeType = Math.max(1, changeType);
    }

    if (this.ctx.isReadReceiptV5) {
      // Restore the latest message receipt when cached.
      try {
        const key = `${trans2ChannelKey(channelIdentifier)}|${model.latestMessage?.messageId || ''}`;
        const info = this.#_rrV5Map.get(key);
        if (info) {
          model.latestMessage!.readReceiptInfo = info;
          changeType = Math.max(1, changeType);
        }
      } catch (e) {
        this.logger.warn(LogTag.L_HANDLE_READ_RECEIPT_V5_E, `handle Updated Items error: ${e}`);
      }
    }
    return { changeType, model };
  }

  private _paddingData(cached: ChatUIChannelModel, data: BaseChannel): void {
    cached.latestMessage = data.latestMessage ? new ChatUIMessageModel(data.latestMessage) : null;
    cached.unreadCount = data.unreadCount || 0;
    cached.isPinned = !!data.isPinned;
    cached.updateTime = data.latestMessage ? data.latestMessage.sentTime : 0;
    if (data.noDisturbLevel) {
      cached.noDisturbLevel = data.noDisturbLevel;
    }
  }

  protected _transDirectionChannel(item: BaseChannel): ChatUIChannelModel {
    const profile = this.ctx.appData.getUserProfiles([item.channelId])[0];
    const cached = this._createCachedChannel(item.identifier);
    cached.name = profile.name;
    cached.avatarUrl = profile.avatarUrl;
    cached.online = profile.online;
    this._paddingData(cached, item);
    return cached;
  }

  protected _transSystemChannel(item: BaseChannel): ChatUIChannelModel {
    const profile = this.ctx.appData.getSystemProfiles([item.channelId])[0];
    const cached = this._createCachedChannel(item.identifier);
    cached.name = profile.name;
    cached.avatarUrl = profile.avatarUrl;
    this._paddingData(cached, item);
    return cached;
  }

  protected _transGroupChannel(item: BaseChannel): ChatUIChannelModel {
    const profile = this.ctx.appData.getGroupProfiles([item.channelId])[0];
    const cached = this._createCachedChannel(item.identifier);
    cached.name = profile.name;
    cached.avatarUrl = profile.avatarUrl;
    cached.memberCount = profile.memberCount;
    this._paddingData(cached, item);
    return cached;
  }

  /**
   * Parse channel list data and filter unsupported channel types.
   */
  private _parseChannelList(list: BaseChannel[]): ChatUIChannelModel[] {
    const result: ChatUIChannelModel[] = [];

    list.forEach((item) => {
      const { channelType } = item;
      switch (channelType) {
        case ChannelType.DIRECT:
          result.push(this._transDirectionChannel(item));
          return;
        case ChannelType.GROUP:
          result.push(this._transGroupChannel(item));
          return;
        case ChannelType.SYSTEM:
          result.push(this._transSystemChannel(item));
          return;
        default:
          return;
      }
    });

    return result;
  }

  /**
   * Get the existing channel list cache.
   * @returns
   */
  getCachedChannelList(): ChatUIChannelModel[] {
    return this._channelList.slice();
  }

  /**
   * Add a channel, sort by `updateTime` and `isTop`, and return its current index.
   * @param item
   * @param sort - Whether to recalculate an existing channel's position. If false, insertion stops.
   * @returns - The channel's original and current positions.
   */
  private _addToChannelList(item: ChatUIChannelModel, sort: boolean = true): {
    /**
     * Original position.
     */
    origin: number,
    /**
     * Current position.
     */
    current: number
  } {
    // Duplicate list data indicates the remote list changed while it was being loaded.
    let origin = this._channelList.findIndex((conv) => conv.channelIdentifier.isEqualTo(item.channelIdentifier));
    if (origin > -1) {
      if (!sort) {
        return { origin, current: origin };
      }

      // Remove the item from its original position before recalculating.
      this._channelList.splice(origin, 1);
    }

    const { isPinned, updateTime } = item;

    let current = this._channelList.findIndex((conv) => {
      if (isPinned !== conv.isPinned) {
        return isPinned;
      }

      return updateTime > conv.updateTime;
    });

    if (current === -1) {
      current = this._channelList.length;
    }
    this._channelList.splice(current, 0, item);
    return { origin, current };
  }

  /** Handle data received from the message module. */
  private _onRecvNewMessages(evt: RecvNewMessagesEvent) {
    this._messageQueue.push(...evt.data);
    this._handleQueue();
  }

  /**
   * Handle message data and return the updated cached channel.
   * @returns - changeType: 0 for no change, 1 for state-only change, 2 for position change.
   */
  private _handleMessage(message: ChatUIMessageModel): { changeType: number, model: ChatUIChannelModel } {
    const currentUserId = this.ctx.userId;
    // 0: no change; 1: state-only change; 2: position change.
    let changeType = 0;
    // Update the channel list from a message batch.
    const key = trans2ChannelKey(message.channelIdentifier);
    const {
      content, channelType, sentTime, isCounted, senderUserId,
    } = message;

    // Get the cached channel.
    let model = this._pool.get(key);
    if (!model) { // Create a channel when no record exists.
      const channel = createNexconnChannel(message.channelIdentifier)!;
      model = this._parseChannelList([channel])[0]
      changeType = 2;
    }

    // Calculate mention data; an existing mention of the current user already has highest priority.
    if (channelType === ChannelType.GROUP && model.mentionedType !== ChatUIMentionedType.AT_ME && senderUserId !== currentUserId) {
      model.mentionedType = Math.max(this._getMentionedType(currentUserId, content.mentionedInfo), model.mentionedType);
      changeType = Math.max(changeType, 1);
    }

    // Update updateTime and latestMessage when the message sentTime is newer.
    if (sentTime >= model.updateTime) {
      model.latestMessage = message;
      model.updateTime = sentTime;
      changeType = 2;
    }

    // Update the unread count.
    if (isCounted && senderUserId !== currentUserId) {
      model.unreadCount += 1;
      changeType = Math.max(changeType, 1);
    }

    return { changeType, model };
  }

  /**
   * Recalculate channel positions in batches and dispatch a list order change event.
   * @param changed
   * @description Batch processing may include state changes, so notifications are calculated even when origin equals current.
   */
  private _recalculatePosition(changed: Set<ChatUIChannelModel>): void {
    const evtData: { order: number, model: ChatUIChannelModel }[] = [];
    // Sort by updateTime ascending and process later channels first so changes do not affect earlier results.
    // Rendering can restore the changed list from evtData order.
    const list = [...changed].sort((a, b) => a.updateTime - b.updateTime);
    // Process position changes together.
    list.forEach(model => {
      const { current } = this._addToChannelList(model);
      evtData.push({ order: current, model });
    })
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, evtData));
  }

  /**
   * Get remote channel list data.
   * @param preview - Whether this is a preview request.
   * @description - Preview data is rendered immediately and need not be complete or fully accurate.
   */
  private async _getMoreRemoteChannels(
    preview: boolean,
    query?: ChannelsQuery
  ) {
    const isReset = !query;
    const pageSize = isReset ? 30 : 200;
    if (!query) {
      query = BaseChannel.createChannelsQuery({ pageSize, startTime: 0 })
    }
    const { data, isOk } = await query.loadNextPage();

    if (!isOk) {
      if (!preview) {
        // Retry after 1 second.
        this._getRemoteChannelsTimer = setTimeout(() => this._getMoreRemoteChannels(preview, query), 1000);
      }
      // Ignore preview failures.
      return
    }

    const channels: BaseChannel[] = data!.data;
    const hasMore = channels.length >= pageSize;

    // Parse the channel list, filter invalid channels, and populate application data.
    const list = this._parseChannelList(channels);

    if (preview) {
      // Render preview data immediately.
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_LIST_RESET, list));
      return;
    }

    if (this.ctx.isReadReceiptV5) {
      // Fetch and attach V5 read data for latest messages.
      // Run asynchronously without blocking the main channel list flow.
      this._handleLatestReadReceiptInfoV5(list);
    }

    if (isReset) {
      // Clear temporary first-screen data.
      this._channelList.length = 0;
    }

    // Append channel list data to the cache.
    list.forEach((item) => this._addToChannelList(item, false));

    if (isReset) {
      // Notify the UI to render the first screen.
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_LIST_RESET, this._channelList.slice(0, 30)));
    }

    if (hasMore) {
      // Recursively fetch more data at 300 ms intervals to avoid rate limiting.
      this._getRemoteChannelsTimer = setTimeout(() => this._getMoreRemoteChannels(preview, query), 300);
      return;
    }

    this._getRemoteChannelsFinished = true;
    this._handleQueue();
  }

  /**
   * Fetch V5 read data for latest messages concurrently and write it to channel readReceiptInfo.
   */
  private async _handleLatestReadReceiptInfoV5(list: ChatUIChannelModel[]) {
    const identifiers = this._buildIdentifiersForLatest(list);
    if (!identifiers.length) return;

    const batchSize = 100;
    const batches: MessageIdentifier[][] = [];
    for (let i = 0; i < identifiers.length; i += batchSize) {
      batches.push(identifiers.slice(i, i + batchSize));
    }
    try {
      // const results = await Promise.all(batches.map((ids) => getMessageReadReceiptInfoV5ByIdentifiers(ids)));
      const results = await Promise.all(batches.map((ids) => BaseChannel.getMessageReadReceiptInfoByIdentifiers(ids)));
      results.forEach((res: NCResult<MessageReadReceiptInfo[]>) => {
        const arr: MessageReadReceiptInfo[] = res?.data || [];
        arr.forEach((it: MessageReadReceiptInfo) => {
          const id = it.channelIdentifier;
          const key = `${trans2ChannelKey(id)}|${it.messageId}`;
          this.#_rrV5Map.set(key, it);
        });
      });
      // Write back through updateCacheChannel to trigger a UI update.
      this._channelList.forEach((model) => {
        if (model.channelType !== ChannelType.DIRECT) return;
        const msg = model.latestMessage;
        if (!msg?.messageId) return;
        const k = `${trans2ChannelKey(model.channelIdentifier)}|${msg.messageId}`;
        const info = this.#_rrV5Map.get(k);
        if (info) {
          model.latestMessage!.readReceiptInfo = info;
          const key = trans2ChannelKey(model.channelIdentifier);
          this._pool.set(key, model);
        }
      });
    } catch (e) {
      this.logger?.warn(LogTag.L_GET_READ_RECEIPT_INFO_V5_E, `getMessageReadReceip·tInfoV5ByIdentifiers error: ${e}`);
    }
  }

  /**
   * Build IMessageIdentifier[] from outgoing latestMessage values in direct channels.
   */
  private _buildIdentifiersForLatest(list: ChatUIChannelModel[]): MessageIdentifier[] {
    const identifiers: MessageIdentifier[] = [];
    list.forEach((item) => {
      const msg = item.latestMessage;
      if (item.channelType === ChannelType.DIRECT
        && msg?.direction === MessageDirection.SEND
        && msg?.messageId) {
        identifiers.push({
          channelIdentifier: item.channelIdentifier,
          messageId: msg.messageId,
        });
      }
    });
    return identifiers;
  }

  /**
   * V5 receipt response: update in-memory channel readReceiptInfo and notify the UI.
  */
  private _onV5ReceiptResponse = (event: MessageReceiptResponseEvent) => {
    if (!this.ctx.isReadReceiptV5) return;
    const responses = event.responses;
    if (!responses || !Array.isArray(responses)) {
      return;
    }
    responses.forEach((info: MessageReadReceiptResponse) => {
      const id = info.channelIdentifier;
      const convKey = trans2ChannelKey(id);
      const v5CacheKey = `${convKey}|${info.messageId}`;
      // Write to the global cache for later channel notification restoration.
      this.#_rrV5Map.set(v5CacheKey, info);

      const cached = this._pool.get(convKey);
      // Refresh the UI when the message is the channel's latestMessage.
      if (cached && cached.latestMessage && cached.latestMessage.messageId === info?.messageId) {
        cached.latestMessage!.readReceiptInfo = info;
        this._pool.set(convKey, cached);
        this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, [cached]));
      }
    });
  }

  /** Whether channel list loading is complete. */
  private _getRemoteChannelsFinished: boolean = false;

  /**
   * Process messages and channel notifications in batches.
   * @returns
   */
  private _handleQueue() {
    if (!this._getRemoteChannelsFinished || !this._pullOfflineMessageFinished) {
      return;
    }

    if (this._messageQueue.length === 0 && this._converNtfQueue.length === 0) {
      return;
    }

    const changed: Set<ChatUIChannelModel> = new Set();
    // Stage channels with position changes and state-only changes.
    const orderChanged: Set<ChatUIChannelModel> = new Set();
    const statChanged: Set<ChatUIChannelModel> = new Set();
    // Pause at max list changes to prevent the UI from blocking on too many updates at once.
    const max = Number.MAX_SAFE_INTEGER;
    // Pause when processing exceeds maxCostTime milliseconds to avoid blocking the main thread.
    const maxCostTime = 20;
    const startTime = Date.now();

    const handleChange = (data: { changeType: number, model?: ChatUIChannelModel }) => {
      const { changeType, model } = data;
      if (changeType === 1) {
        statChanged.add(model!);
        changed.add(model!);
      } else if (changeType === 2) {
        orderChanged.add(model!);
        changed.add(model!);
      }
    }

    // Process the message queue first.
    this._handleMessageQueue(handleChange, changed, max, maxCostTime, startTime);

    // Empty the message list before channel notifications so missing cached channels can be classified as deleted or not yet created.
    // Before list loading completes, process only notifications whose updatedItems.latestMessage.isOffline is true.
    // After loading completes, discard those offline notifications and process the rest normally.
   this._handleChannelNotifyQueue(handleChange, changed, max, maxCostTime, startTime);

    if (orderChanged.size) {
      // Calculate channel position changes and notify the UI.
      this._recalculatePosition(orderChanged);
    }

    if (statChanged.size) {
      // Do not notify the UI again for channels already in orderChanged.
      const list = [...statChanged].filter(item => !orderChanged.has(item));
      if (list.length) {
        // Notify the UI to update the channel list.
        this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, list));
      }
    }
  }

  /** Process the message queue. */
  private _handleMessageQueue(
    handleChange: (data: { changeType: number, model?: ChatUIChannelModel }) => void,
    changed: Set<ChatUIChannelModel>,
    max: number,
    maxCostTime: number,
    startTime: number,
  ) {
    while (this._messageQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
      const message = this._messageQueue.shift()!;
      handleChange(this._handleMessage(message));
    }
  }

  /** Process the channel notification queue. */
  private _handleChannelNotifyQueue(
    handleChange: (data: { changeType: number, model?: ChatUIChannelModel }) => void,
    changed: Set<ChatUIChannelModel>,
    max: number,
    maxCostTime: number,
    startTime: number,
  ) {
    if (!this._getRemoteChannelsFinished) {
      // Before channel list loading completes, process only channel notifications caused by offline messages.
      let i = 0;
      while (this._messageQueue.length === 0 && i < this._converNtfQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
        i += 1; // Skip other notifications.
      }
      return;
    }

    while (this._messageQueue.length === 0 && this._converNtfQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
      const item = this._converNtfQueue.shift()!;
      handleChange(this._handleChannelNtf(item));
    }
  }

  /**
   * Get channel list data preceding a specified channel.
   * @param model - Target channel. If omitted, get the latest channel list data.
   * @description - Gets 30 channels before the target position and excludes the target channel.
   */
  public async getMoreChannelList(model: ChatUIChannelModel | null) {
    let index = model
      ? this._channelList.findIndex((item) => item.channelIdentifier.isEqualTo(model.channelIdentifier))
      : -1;
    if (index === -1) {
      index = 0;
    } else {
      // Exclude the target channel from the result.
      index = index + 1;
    }

    const endIndex = index + 30;
    const list = this._channelList.slice(index, endIndex);
    const hasMore = this._channelList.length > endIndex || !this._getRemoteChannelsFinished;
    return { hasMore, code: NCChatUICode.SUCCESS, list };
  }

  /**
   * Show a standard alert selected by error code when an IMLib API does not return SUCCESS.
   */
  private _alertChatFailure(code: number): void {
    const key: keyof LanguagePackEntries = code === IMLIB_ALERT_CHECK_NETWORK_CODE
      ? 'alert.imlib.failed.network'
      : 'alert.imlib.failed.generic';
    this.ctx.alert(key, code);
  }

  /**
   * Delete a channel and dispatch a selection change event if it is open.
   * @emits {@link ChatUIEvents.CHANNELS_ITEM_DELETED}
   * @param channelIdentifier
   */
  async deleteChannel(channelIdentifier: ChannelIdentifier): Promise<void> {
    // Delete the channel through IMLib.
    const channel = createNexconnChannel(channelIdentifier);
    if (!channel) {
      return;
    }
    const { code, isOk } = await channel.delete()
    if (!isOk) {
      this._alertChatFailure(code);
      return;
    }

    // Clear cached data.
    const key = trans2ChannelKey(channelIdentifier);
    const index = this._channelList.findIndex((item) => item.channelIdentifier.isEqualTo(channelIdentifier));
    if (index > -1) {
      const [cached] = this._channelList.splice(index, 1);
      this._pool.delete(key);
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_DELETED, [cached]));

      if (cached === this._openedChannelModel) {
        this._setOpenedChannel(null, false);
      }
    }

    // Clear messages while deleting the channel.
    const bool = this.ctx.store.getCommandSwitch(ChatUICommand.DELETE_MESSAGES_WHILE_DELETE_CHANNEL);
    if (!bool) {
      return;
    }
    // Clear the message cache list.
    this.ctx.message.removeCachedMessages(channelIdentifier);

    const timestamp = getServerTime() + 5000;
    // Delete messages from the service.
    channel.deleteMessagesForMeByTimestamp({ timestamp });
  }

  /**
   * Open a channel, creating it at the top of the list when it does not exist.
   * @param identifier
   * @param focusInput - Whether to focus the input by default.
   */
  async openChannel(identifier: ChannelIdentifier, focusInput: boolean = true): Promise<NCResult> {
    if (!(identifier instanceof ChannelIdentifier)) {
      return NCResult.fail(NCChatUICode.INVALID_CHANNEL);
    }

    if (!this._getRemoteChannelsFinished || !this._pullOfflineMessageFinished) {
      return NCResult.fail(NCChatUICode.CHANNEL_LIST_NOT_READY);
    }

    if (this._openedChannelModel && this._openedChannelModel.channelIdentifier.isEqualTo(identifier)) {
      return NCResult.ok();
    }

    // Check whether the channel exists.
    let index = this._channelList.findIndex((item) => item.channelIdentifier.isEqualTo(identifier));
    let cached = this._channelList[index];

    if (!cached) {
      // Create a new channel.
      const channel = createNexconnChannel(identifier)!;
      [cached] = this._parseChannelList([channel]);
      // Set the update time.
      cached.updateTime = getServerTime();
      this._recalculatePosition(new Set([cached]));
    }

    this._setOpenedChannel(cached, focusInput);
    return NCResult.ok();
  }

  private _setOpenedChannel(model: ChatUIChannelModel | null, focusInput: boolean = true): void {
    // Clear typing state rate-limit records.
    this._clearTypingStatus();

    this._openedChannelModel = model;
    this.ctx.emit(new ChatUIEvent(ChatUIEvents.CHANNEL_SELECTED, { model, focusInput }), 1);
  }

  /**
   * Set the channel notification level.
   * @param channelIdentifier - Channel.
   * @param level - Notification level.
   */
  async setNoDisturbLevel(channelIdentifier: ChannelIdentifier, level: ChannelNoDisturbLevel): Promise<{ code: number }> {
    const cached = this._channelList.find((item) => item.channelIdentifier.isEqualTo(channelIdentifier));
    if (!cached) {
      return { code: NCChatUICode.GET_CHANNEL_FAILED };
    }

    if (cached.noDisturbLevel === level) {
      return { code: NCChatUICode.SUCCESS };
    }

    const channel = createNexconnChannel(channelIdentifier)!;
    const { isOk, code } = await channel.setNoDisturbLevel(level);
    if (!isOk) {
      this._alertChatFailure(code);
      return { code };
    }

    // Explicitly notify the UI on both Electron and Web.
    cached.noDisturbLevel = level;
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, [cached]));

    return { code };
  }

  /**
   * Set channel pinned state.
   * @param channelIdentifier - Channel.
   * @param isPinned - Whether to pin the channel.
   */
  async setChannelPinned(channelIdentifier: ChannelIdentifier, isPinned: boolean): Promise<{ code: number }> {
    isPinned = !!isPinned;
    const cached = this._channelList.find((item) => item.channelIdentifier.isEqualTo(channelIdentifier));
    if (!cached) {
      return { code: NCChatUICode.GET_CHANNEL_FAILED };
    }
    if (cached.isPinned === isPinned) {
      return { code: NCChatUICode.SUCCESS };
    }

    const channel = createNexconnChannel(channelIdentifier)!;
    const { isOk, code } = await (isPinned ? channel.pin() : channel.unpin());
    if (!isOk) {
      this._alertChatFailure(code);
      return { code };
    }

    // Explicitly update cached data and refresh the UI on both Electron and Web.
    cached.isPinned = isPinned;
    this._recalculatePosition(new Set([cached]));

    return { code };
  }

  getCachedChannelByKey(key: string): ChatUIChannelModel {
    return this._pool.get(key)!;
  }

  /**
   * Clear message unread counts by timestamp.
   */
  async clearUnreadCountByTimestamp(channelIdentifier: ChannelIdentifier): Promise<NCResult> {
    const cached = this.getCachedChannelByKey(trans2ChannelKey(channelIdentifier));
    const channel = createNexconnChannel(channelIdentifier);
    if (!channel) {
      return NCResult.fail(NCChatUICode.GET_CHANNEL_FAILED);
    } ;

    const res = await channel.clearUnreadCount();
    if (!res.isOk) return res.wipe();

    cached.unreadCount = 0;
    cached.mentionedType = ChatUIMentionedType.NONE;
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_CHANGE, [cached]));
    return NCResult.ok();
  }

  /**
   * Update cached data when switching channels.
   * @param channelIdentifier
   * @param value
   * @returns
   */
  async handleChannelDraft(channelIdentifier: ChannelIdentifier | null, value?: string): Promise<void> {
    if (!channelIdentifier) return
    const channel = createNexconnChannel(channelIdentifier);
    if (!channel) return
    const { data } = await channel.reload();
    if (data?.draft === value) return

    const key = trans2ChannelKey(channelIdentifier);
    let cached = this._pool.get(key);

    if (value) {
      const { isOk } = await channel.saveDraft(value);
      if (!isOk || !cached) return
      cached.draft = value
      cached.updateTime = getServerTime()
      const { current } = this._addToChannelList(cached);
      // Dispatch a notification.
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, [{ order: current, model: cached }]));
      return
    }
    await channel.clearDraft();
    if (!cached) return
    cached.draft = ''
    if (cached.latestMessage) {
      cached.updateTime = cached.latestMessage.sentTime
    }
    const { current } = this._addToChannelList(cached);
    // Dispatch a notification.
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, [{ order: current, model: cached }]));

  }

  private _typingTime: any = null;

  /**
   * Send typing state to the open direct channel.
   */
  sendTypingStatus(type: string = MessageType.TEXT) {
    if (!this._openedChannelModel || this._openedChannelModel.channelType !== ChannelType.DIRECT) {
      return;
    }
    // Check the rate limit.
    if (this._typingTime) {
      return;
    }

    this._typingTime = setTimeout(() => {
      this._typingTime = null;
    }, 5000);
    const channel = createNexconnChannel(this._openedChannelModel!.channelIdentifier) as DirectChannel;
    if (!channel) return
    channel.sendTypingStatus(type)
  }

  /**
   * Clear typing rate-limit records.
   */
  private _clearTypingStatus() {
    if (this._typingTime) {
      clearTimeout(this._typingTime);
      this._typingTime = null;
    }
  }
}
