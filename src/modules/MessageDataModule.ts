import { createNexconnChannel, getServerTime } from '@lib/helper';
import {
  ChannelIdentifier, ChannelType, ConnectionStatus, Helper, Message, NCResult, SendMessageParams, SentStatus,
  MessageType,
  CombineMessageInfo,
  CombineMessageContent,
  NCEngine,
  MessageHandler,
  MessageReceiptResponseEvent,
  MessageReadReceiptResponse,
  MessageReceivedEvent,
  MessageDeletedEvent,
  BaseChannel,
  MessageDirection,
  MessageDeletedInfo,
  TextMessageContent,
  FileMessageContent,
} from '@nexconn/chat';
import { ChatUIModule } from './ChatUIModule';
import { MessageSendQueue, FileUploadQueue } from './Queue';
import {
  isInvalidChannel, isDirectChannelOrGroupChannel, trans2ChannelKey, findLastIndex,
} from '../helper';
import { ChatUIEvent } from '../core/ChatUIEvent';
import { ChatUIContext } from '../core/ChatUIContext';
import { NCChatUICode } from '../enums/NCChatUICode';
import { LogTag } from '@lib/enums/LogTag';
import { getMessageDesc } from '@lib/ui/provider/context';
import { DeleteMessageData, InnerEvent, ChatUIEvents } from '@lib/core/EventDefined';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

/**
 * In-memory message cache.
 */
interface IChatUIMessagesCacheData {
  /**
   * Message segment data.
   */
  histories: ChatUIMessageModel[];
  /**
   * Segment start time. Messages at this timestamp are excluded.
   */
  startTime: number;
  /**
   * Segment end time. Messages at this timestamp are excluded.
   */
  endTime: number;
  /**
   * Whether more history exists before the start time.
   */
  hasMoreBeforeStartTime: boolean;
  /**
   * Whether more history exists after the end time.
   */
  hasMoreAfterEndTime: boolean;
}

const MESSAGE_PAGE_SIZE = 30;

const parseFiles = (file: File): Promise<NCResult<SendMessageParams>> => {
  switch (file.type) {
    case 'image/gif':
      return Helper.createSendGIFMessageParams(file);
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/png':
      return Helper.createSendImageMessageParams(file);
    case 'video/mp4':  // Nexconn does not yet support sending short videos, so create a file message.
    default:
      return Helper.createSendFileMessageParams(file);
  }
}

/**
 * Message module. Handles message data without interacting with the channel list.
 * The channel module handles `latestMessage` and other channel list state.
 * @emits
 * - {@link ChatUIEvents.INSERT_MESSAGE} - Insert a message into the list.
 * - {@link ChatUIEvents.MESSAGE_UPDATE} - Update message state.
 * @method
 * - Maintain in-memory history while reconciling sending and persisted messages.
 * - Maintain the message sending queue.
 * - Maintain the message upload queue.
 * - Send messages and maintain their sending state.
 * - Insert messages.
 * - Receive, dispatch, and stage messages.
 * - Delete and recall messages.
 */
export class MessageModule extends ChatUIModule {
  /**
   * Message sending queue.
   */
  private readonly _sendQueue: MessageSendQueue;

  /**
   * File upload queue.
   */
  private readonly _uploadQueue: FileUploadQueue;

  private _transactionIdCount = 0;

  /**
   * Stages message list data to reconcile locally sending messages with persisted messages.
   */
  private _histories: Map<string, IChatUIMessagesCacheData> = new Map();

  /**
   * Tracks messageUIds with sent V5 receipts to prevent duplicates.
   */
  private _v5Responded = new Set<string>();

  constructor(ctx: ChatUIContext) {
    super(ctx);

    this._sendQueue = new MessageSendQueue(ctx);
    this._uploadQueue = new FileUploadQueue(ctx);
  }

  protected _onInit(): void {
    const onMessageReceiptResponse = (event: MessageReceiptResponseEvent) => {
      this._onV5ReceiptResponse(event.responses)
    }
    const onMessageReceived = (event: MessageReceivedEvent) => {
      this._handleMessages(event.messages)
    }
    const onMessageDeleted = (event: MessageDeletedEvent) => {
      this._handleMessagesDeleted(event.messages)
    }
    NCEngine.addMessageHandler('msg-data-module', new MessageHandler({
      onMessageReceiptResponse,
      onMessageReceived,
      onMessageDeleted,
    }));
  }

  protected _onInitUserCache(): void {
    // No implementation required.
  }

  protected _onDestroyUserCache(): void {
    this._histories.clear();
    this._transactionIdCount = 0;
  }

  public destroy(): void {
    this._onDestroyUserCache();
    this._sendQueue.destroy();
    this._uploadQueue.destroy();
    NCEngine.removeMessageHandler('msg-data-module');
  }

  /**
   * Generate a local message ID used to match tasks across sending stages.
   */
  private _createTransactionId(): number {
    return ++this._transactionIdCount;
  }

  private _getExistCache(channelIdentifier: ChannelIdentifier): IChatUIMessagesCacheData | undefined {
    const key = channelIdentifier instanceof ChannelIdentifier
      ? trans2ChannelKey(channelIdentifier)
      : trans2ChannelKey(channelIdentifier);
    return this._histories.get(key);
  }

  /**
   * Get or create cached data for a channel.
   * When no local cache exists, startTime must be 0. Otherwise, receiving a channel message
   * before loading its history prevents remote history from merging with cached data.
   */
  private _getOrCreateCache(
    channelIdentifier: ChannelIdentifier,
    timestamp: number,
    hasMoreAfterEndTime: boolean,
    hasMoreBeforeStartTime: boolean,
  ): IChatUIMessagesCacheData {
    const key = trans2ChannelKey(channelIdentifier);
    let cached = this._histories.get(key);
    if (!cached) {
      cached = {
        histories: [],
        startTime: 0,
        endTime: timestamp === 0 ? getServerTime() : timestamp,
        hasMoreAfterEndTime,
        hasMoreBeforeStartTime,
      };
      this._histories.set(key, cached);
    }
    return cached;
  }

  /**
   * Append messages to the cache with automatic deduplication.
   * @param histories
   * @param message
   */
  private _push2Cache(cache: IChatUIMessagesCacheData, ...messages: ChatUIMessageModel[]): void {
    const { histories, startTime } = cache;
    messages.forEach((message) => {
      // History and live messages may interleave; replace matching messages to prevent duplicates.
      const duplicateIndex = histories.findIndex((item) => {
        if (message.messageId && item.messageId) {
          return item.messageId === message.messageId;
        }
        if (message.clientId && item.clientId) {
          return item.clientId === message.clientId;
        }
        return false;
      });
      if (duplicateIndex !== -1) {
        histories.splice(duplicateIndex, 1, message);
      } else {
        // Find a message older than the current message.
        const index = findLastIndex(histories, (item) => item.sentTime < message.sentTime);
        if (index === -1) {
          histories.unshift(message);
        } else {
          histories.splice(index + 1, 0, message);
        }
      }
      // Update the end time.
      const newTime = message.sentTime + 1;
      cache.endTime = cache.endTime === 0 ? newTime : Math.max(cache.endTime, newTime);
    });
    if (!startTime) {
      cache.startTime = Math.min(...messages.map(item => item.sentTime)) - 1;
    }
  }

  /**
   * Prepend messages to the cache with automatic deduplication.
   * @param cache
   * @param messages
   */
  private _unshift2Cache(cache: IChatUIMessagesCacheData, ...messages: ChatUIMessageModel[]): void {
    const { histories } = cache;
    messages.forEach((message) => {
      // Find a message newer than the current message.
      const index = histories.findIndex((item) => item.messageId === message.messageId || item.sentTime > message.sentTime);
      if (index === -1) {
        histories.push(message);
      } else if (histories[index].messageId !== message.messageId) {
        // Do not insert a duplicate message ID.
        histories.splice(index, 0, message);
      }
      // Update the start time.
      const newTime = message.sentTime - 1;
      cache.startTime = cache.startTime === 0 ? newTime : Math.min(cache.startTime, newTime);
    });
  }

  /**
   * Receipt response: refresh V5 data for the related messages.
   */
  private _onV5ReceiptResponse(responses: MessageReadReceiptResponse[]): void {
    try {
      if (!responses || !Array.isArray(responses)) return;
      // Update in-memory data first so the UI refreshes immediately.
      responses.forEach((r: MessageReadReceiptResponse) => {
        const key = trans2ChannelKey(r.channelIdentifier);
        let cached = this._histories.get(key);
        if (!cached) return;
        const index = cached.histories.findIndex((item) => item.messageId === r.messageId);
        if (index < 0) return;
        cached.histories[index].readReceiptInfo = r;
        this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cached.histories[index]]));
      });
    } catch (e) {
      this.logger.warn(LogTag.L_V5_RECEIPT_RESPONSE_E, `onV5ReceiptResponse error: ${e}`);
    }
  }

  /**
   * Send V5 receipts for specified messages in the current channel.
   * Validate and deduplicate messageUIds against the in-memory cache, excluding outgoing,
   * already acknowledged, and missing messages.
   */
  private async _sendReadReceiptMessageV5(identifier: ChannelIdentifier, messages: ChatUIMessageModel[]) {
    if (!this.ctx.isReadReceiptV5) return;
    const messageUIds = messages.map((item) => item.messageId);
    // Deduplicate and exclude outgoing, already acknowledged, and missing cached messages.
    const ids = Array.from(new Set((messageUIds || []).filter(Boolean)));

    if (ids.length === 0) {
      return;
    }

    const convKey = trans2ChannelKey(identifier);
    const cached = this._histories.get(convKey);
    if (!cached || !cached.histories.length) return;
    const sendReceiptMessages = new Set(ids.filter((id) => {
      const m = cached.histories.find((x) => x.messageId === id);
      if (!m) return false;
      const isReceive = m.direction === 2;
      const notResponded = !this._v5Responded.has(id) && m.sentReceipt !== true && m.needReceipt;
      return isReceive && notResponded;
    }));

    if (sendReceiptMessages.size === 0) {
      return;
    }
    const sendReceiptMessagesList = Array.from(sendReceiptMessages);
    const channel = createNexconnChannel(identifier)!;
    const res = await channel.sendReadReceiptResponse(sendReceiptMessagesList);
    sendReceiptMessagesList.forEach((id) => this._v5Responded.add(id));
    this._markSendReceiptTrue(identifier, sendReceiptMessagesList);
  }

  /**
   * Mark in-memory messages as having sent receipts.
   */
  private _markSendReceiptTrue(identifier: ChannelIdentifier, ids: string[]) {
    try {
      if (!ids || !ids.length) return;
      const convKey = trans2ChannelKey(identifier);
      const cached = this._histories.get(convKey);
      if (!cached) return;
      const set = new Set(ids);
      cached.histories.forEach((it) => {
        if (it.messageId && set.has(it.messageId)) {
          it.sentReceipt = true;
        }
      });
    } catch (e) { this.logger.warn(LogTag.L_SEND_V5_RECEIPT_E, `markSendReceiptTrue error: ${e}`); }
  }

  private _handleMessages(messages: Message<any>[]): void {
    // The application layer handles non-persisted messages.
    const unPresitedMsgs: ChatUIMessageModel[] = [];
    // Messages to notify the UI about.
    let newMsgs: ChatUIMessageModel[] = [];

    messages.forEach(async (message) => {
      const msg = new ChatUIMessageModel(message);

      if (!message.isPersisted || isInvalidChannel(message.channelIdentifier)) {
        // Dispatch non-persisted messages and messages with invalid channel types to the application layer.
        unPresitedMsgs.push(msg);
        return;
      }

      newMsgs.push(msg);
    });

    // Process newMsgs again.
    newMsgs = this._handleNotifiedUIMessaages(newMsgs);

    // Notify the UI of new messages.
    if (newMsgs.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.RECV_NEW_MESSAGES, newMsgs));
    }

    // Notify the application layer of non-persisted messages.
    if (unPresitedMsgs.length) {
      this.ctx.emit(new ChatUIEvent(ChatUIEvents.UNSCHEDULED_MESSAGES, unPresitedMsgs));
    }
  }

  private _handleMessagesDeleted(messages: MessageDeletedInfo[]): void {
    const deletedList: DeleteMessageData[] = messages.map(({ channelIdentifier, messageId, operationTime }) => {
      const info: DeleteMessageData = { channelIdentifier, messageId };
      const cached = this._getOrCreateCache(channelIdentifier, operationTime, false, true);
      if (cached.histories.length > 0) {
        const index = cached.histories.findIndex((item) => item.messageId === messageId);
        if (index !== -1) {
          // Replace the original cached message.
          const [target] = cached.histories.splice(index, 1);
          info.transactionId = target.transactionId;
        }
      }
      return info;
    });
    this.ctx.dispatchEvent(new ChatUIEvent(ChatUIEvents.MESSAGES_DELETED, deletedList));
  }

  // Messages to notify the UI about.
  private _handleNotifiedUIMessaages(messages: ChatUIMessageModel[]): ChatUIMessageModel[] {
    messages.forEach((msg) => {
      const cached = this._getOrCreateCache(msg.channelIdentifier, msg.sentTime + 1, false, true);
      // Attempt to cache messages that are not recalls.
      if (!cached.hasMoreAfterEndTime) {
        // The cache reaches the latest data, so append the message and update endTime.
        this._push2Cache(cached, msg);
      }
    });
    return messages;
  }

  /**
   * Check whether a timestamp overlaps the specified message list.
   * @param cache
   * @param timestamp
   * @returns
   */
  private _ifTimeCoincides(cache: IChatUIMessagesCacheData, timestamp: number): boolean {
    return cache.endTime >= timestamp && cache.startTime <= timestamp;
  }

  /**
   * Request history from IMLib and merge overlapping results into the cache.
   * @param channelIdentifier
   * @param timestamp
   * @param forward
   */
  private async _requestHistoriesFromLib(channelIdentifier: ChannelIdentifier, timestamp: number, forward: boolean): Promise<{ hasMore: boolean, list: ChatUIMessageModel[], code: number }> {
    const query = BaseChannel.createMessagesQuery({
      channelIdentifier,
      pageSize: MESSAGE_PAGE_SIZE,
      startTime: timestamp,
      isAscending: !forward,
    });
    const res = await query.loadNextPage();
    if (!res.isOk) {
      return { code: res.code, hasMore: true, list: [] };
    }
    const hasMore = query.hasNext;
    const { data: list } = res.data!;
    let tmpList = await this._handleTransIAReceivedMessages(list, channelIdentifier);

    // Cached data must exist here, so arguments after the first have no practical effect.
    const cached = this._getOrCreateCache(channelIdentifier, timestamp, timestamp !== 0, true);

    // Keep the cache start before the first unread timestamp, including Electron cases where it exceeds local history.
    if (!forward && timestamp !== 0 && cached.startTime > timestamp) {
      cached.startTime = timestamp - 1
    }

    if (
      // Check whether the request timestamp overlaps cached data.
      this._ifTimeCoincides(cached, timestamp)
      // The message list overlaps the cached time range.
      || (list.length && (this._ifTimeCoincides(cached, list[0].sentTime) || this._ifTimeCoincides(cached, list[list.length - 1].sentTime)))
    ) {
      // Merge overlapping data.
      if (forward) {
        // Reverse server data because it is descending.
        tmpList = tmpList.reverse();
        this._unshift2Cache(cached, ...tmpList);
        cached.hasMoreBeforeStartTime = hasMore;
      } else {
        this._push2Cache(cached, ...tmpList);
        cached.hasMoreAfterEndTime = hasMore;
      }
    }

    return { hasMore, list: tmpList, code: NCChatUICode.SUCCESS };
  }

  private async _handleTransIAReceivedMessages(
    messages: Message[],
    channelIdentifier: ChannelIdentifier
  ): Promise<ChatUIMessageModel[]> {
    const kitMessages: ChatUIMessageModel[] = messages.map((item) => new ChatUIMessageModel(item));
    // V5 behavior.
    if (this.ctx.isReadReceiptV5) {
      return await this._handleReadReceiptV5(channelIdentifier, kitMessages);
    }
    return kitMessages;
  }

  private async _handleReadReceiptV5(
    channelIdentifier: ChannelIdentifier,
    kitMessages: ChatUIMessageModel[]
  ): Promise<ChatUIMessageModel[]> {
    if (kitMessages.length === 0) return [];
    const channel = createNexconnChannel(channelIdentifier)!;
    try {
      // Fetch read state only for outgoing messages.
      const selfSentMessages = kitMessages.filter((item) => item.senderUserId === this.ctx.userId);
      if (selfSentMessages.length === 0) return kitMessages;

      const messageUIds = selfSentMessages.map((item) => item.messageId);
      // const { data } = await getMessageReadReceiptInfoV5(channelIdentifier, messageUIds);
      const { data } = await channel.getMessageReadReceiptInfo(messageUIds);
      if (data && data.length > 0) {
        data.forEach((item) => {
          const index = kitMessages.findIndex((cacheItem) => cacheItem.messageId === item.messageId);
          if (index > -1) { kitMessages[index].readReceiptInfo = item; }
        })
      }
    } catch (e) {
      this.logger.warn(LogTag.L_HANDLE_READ_RECEIPT_V5_E, `_handleReadReceiptV5 error: ${e}`);
    }
    return kitMessages;
  }

  private async _reqHistoriesHandler(
    channelIdentifier: ChannelIdentifier,
    timestamp: number = 0,
    forward: boolean = true,
  ): Promise<{ hasMore: boolean, list: ChatUIMessageModel[], code: number }> {
    // Get cached data.
    const cached = this._getOrCreateCache(channelIdentifier, timestamp, timestamp !== 0, true);
    const { histories, hasMoreAfterEndTime, hasMoreBeforeStartTime, startTime, endTime } = cached;
    if (!hasMoreAfterEndTime && timestamp === 0 && forward) {
      // Ensure switching channels can fetch current history when endTime predates the last cached sentTime.
      const messageTime = histories[histories.length - 1]?.sentTime || 0
      if (messageTime > endTime) {
        cached.endTime = messageTime + 1
      }
      timestamp = cached.endTime;
    }

    if (!this._ifTimeCoincides(cached, timestamp)) {
      // Request remote data when the timestamp does not overlap the cache.
      return this._requestHistoriesFromLib(channelIdentifier, timestamp, forward);
    }

    // Get all cached messages in the requested time range.
    let list: ChatUIMessageModel[];
    if (forward) {
      const index = findLastIndex(histories, (item) => item.sentTime < timestamp);
      list = histories.slice(0, index + 1);
    } else {
      const index = histories.findIndex((item) => item.sentTime > timestamp);
      list = histories.slice(index);
    }

    const hasMore = forward ? hasMoreBeforeStartTime : hasMoreAfterEndTime;

    if (list.length < MESSAGE_PAGE_SIZE) {
      return await this._reqHasMoreHistories(hasMore, startTime, endTime, forward, channelIdentifier, timestamp, list);
    }

    let msgList = forward ? list.slice(list.length - MESSAGE_PAGE_SIZE) : list.slice(0, MESSAGE_PAGE_SIZE);

    // V5 behavior: refresh read state for outgoing messages loaded from the cache.
    if (this.ctx.isReadReceiptV5 && channelIdentifier.channelType === ChannelType.GROUP) {
      // Refresh read state and update the cache.
      await this._handleReadReceiptV5(channelIdentifier, msgList);
      // Update cached messages synchronously.
      msgList.forEach((msg) => {
        const index = cached.histories.findIndex((item) => item.messageId === msg.messageId);
        if (index > -1 && msg.readReceiptInfo) {
          cached.histories[index].readReceiptInfo = msg.readReceiptInfo;
        }
      });
    }

    // Return the requested entries when enough cached data exists.
    return {
      // Return true when either remote or cached data has more entries.
      hasMore: hasMore || list.length > MESSAGE_PAGE_SIZE,
      list: msgList,
      code: NCChatUICode.SUCCESS
    };
  }

  private async _reqHasMoreHistories(
    hasMore: boolean,
    startTime: number,
    endTime: number,
    forward: boolean,
    channelIdentifier: ChannelIdentifier,
    timestamp: number = 0,
    list: ChatUIMessageModel[] = []
  ): Promise<{ hasMore: boolean, list: ChatUIMessageModel[], code: number }> {
    if (hasMore) {
      // Fetch more history from IMLib when the cache is insufficient and more data exists.
      const forwardTime = startTime === 0 ? 0 : startTime + 1;
      const backwardTime = endTime === 0 ? 0 : endTime - 1;
      const tmpTimestamp = forward ? forwardTime : backwardTime;
      const { code } = await this._requestHistoriesFromLib(channelIdentifier, tmpTimestamp, forward);
      if (code === NCChatUICode.SUCCESS) {
        // Continue recursively.
        return this._reqHistoriesHandler(channelIdentifier, timestamp, forward);
      }
      // Return cached data when this request fails.
      return { hasMore, list, code };
    }
    // No more data is available.
    return { hasMore, list, code: NCChatUICode.SUCCESS };
  }

  /**
   * Get channel history, 30 messages by default.
   * @param identifier - Channel.
   * @param timestamp - Timestamp. Defaults to the current time; results exclude messages at this timestamp.
   * @param forward - Whether to retrieve messages before the timestamp. Defaults to true.
   */
  reqHistories(
    identifier: ChannelIdentifier,
    timestamp: number = 0,
    forward: boolean = true
  ): Promise<{ hasMore: boolean, list: ChatUIMessageModel[], code: number }> {
    return this._reqHistoriesHandler(identifier, timestamp, forward);
  }

  private emitMessageWillSend(channelIdentifier: ChannelIdentifier, params: SendMessageParams<any>): void {
    this.ctx.emit(new ChatUIEvent(ChatUIEvents.MESSAGE_WILL_SEND, { channelIdentifier, params }), 2);
  }

  /**
   * Send a message. Only direct and group channels are supported; other channel types return parameter error -3.
   */
  public async sendMessage(
    channelIdentifier: ChannelIdentifier,
    params: SendMessageParams<any>
  ): Promise<NCResult<Message>> {
    if (isInvalidChannel(channelIdentifier) || !isDirectChannelOrGroupChannel(channelIdentifier)) {
      return NCResult.fail(NCChatUICode.INVALID_CHANNEL);
    }

    this.emitMessageWillSend(channelIdentifier, params);

    const message: Message = Helper.createMessage(channelIdentifier, params)
    const msg = new ChatUIMessageModel(message);
    msg.transactionId = this._createTransactionId();;
    msg.sentTime = getServerTime();

    // Non-persisted messages do not require caching or UI updates.
    if (message.isPersisted) {
      const cached = this._getOrCreateCache(channelIdentifier, msg.sentTime + 1, false, true);
      if (cached.hasMoreAfterEndTime) {
        // History was loaded from an intermediate timestamp, so cached data does not reach current data.
        // Preserve local sending state and clear history to avoid a cache gap.
        cached.histories.length = 0;
        cached.startTime = msg.sentTime;
        cached.hasMoreBeforeStartTime = true;
        cached.hasMoreAfterEndTime = false;
      }
      this._push2Cache(cached, msg);

      // Notify the UI to update the message list.
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.INSERT_NEW_MESSAGES, [msg]));
    }

    // Add the message to the sending queue.
    const res: NCResult<Message> = await this._sendQueue.push({
      channelIdentifier,
      message: msg,
      transactionId: msg.transactionId,
      params,
    });
    if (!res.isOk) {
      msg.sentStatus = SentStatus.FAILED;
    } else {
      this._updateCachedMessage(msg, res.data!);

      if (this.ctx.isReadReceiptV5 && msg.channelType === ChannelType.GROUP) {
        await this._handleReadReceiptV5(channelIdentifier, [msg]);
      }
    }

    if (msg.isPersisted) {
      // Notify the UI to update the message list.
      this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [msg]));
    }
    return res;
  }

  private _updateCachedMessage(msg: ChatUIMessageModel, source: Message): void {
    const { sentStatus, sentTime, messageId, clientId } = source;
    msg.sentStatus = sentStatus as SentStatus;
    msg.sentTime = sentTime;
    msg.messageId = messageId;
    msg.clientId = clientId;
  }

  /**
   * Send media and file messages in batches.
   */
  private async _sendMultiMediaMessage(
    msgCreator: (file: File) => Promise<NCResult<SendMessageParams<any>>>,
    channelIdentifier: ChannelIdentifier,
    files: File[]
  ): Promise<void> {
    if (files.length > 99) {
      this.ctx.alert('alert.pickfiles.maxcount', '99');
      return;
    }

    // Identify invalid files.
    const invalid: File[] = [];
    const valid: File[] = [];
    for (let file of files) {
      // Files over 100 MB or with zero size are invalid.
      if (file.size > 100 * 1024 * 1024 || file.size === 0) {
        invalid.push(file);
      } else {
        valid.push(file);
      }
    }

    if (invalid.length > 0) {
      // Notify the application layer that some files have invalid sizes.
      this.ctx.emit(new ChatUIEvent(ChatUIEvents.FILE_SEND_FAILED_EVENT, invalid))
    }

    if (valid.length === 0) {
      return;
    }

    // Messages to cache.
    const sendParamMap: Map<ChatUIMessageModel, SendMessageParams<any>> = new Map();
    const models: ChatUIMessageModel[] = [];

    await Promise.all(valid.map(async (file) => {
      const paramsRes: NCResult<SendMessageParams<any>> = await msgCreator(file);
      if (!paramsRes.isOk) {
        return;
      }
      const params = paramsRes.data!;
      this.emitMessageWillSend(channelIdentifier, params);
      const message: Message = Helper.createMessage(channelIdentifier, params);
      message.sentTime = getServerTime();
      const model = new ChatUIMessageModel(message);
      model.transactionId = this._createTransactionId();;
      model.file = file;
      model.progress = 0;
      models.push(model);
      sendParamMap.set(model, params);
    }));

    // Mark media messages as failed while offline, matching text message behavior.
    const offline = this.ctx.status !== ConnectionStatus.CONNECTED;
    if (offline) {
      models.forEach((msg) => {
        msg.progress = -1;
        msg.sentStatus = SentStatus.FAILED;
      });
    }

    // Insert into the cache.
    const startTime = models[0].sentTime + 1;
    const cached = this._getOrCreateCache(channelIdentifier, startTime, false, true);
    if (cached.hasMoreAfterEndTime) {
      // Clear the cache.
      cached.histories.length = 0;
      cached.startTime = startTime;
      cached.hasMoreBeforeStartTime = true;
      cached.hasMoreAfterEndTime = false;
    }
    this._push2Cache(cached, ...models);

    // Notify the UI to update the message list.
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.INSERT_NEW_MESSAGES, models), false);

    // Return while offline without entering the upload or sending queues.
    if (offline) {
      return;
    }

    // Add messages to the upload queue in order.
    const promises = models.map((msg) => {
      const { transactionId, file } = msg;
      const onProgress = (loaded: number, total: number) => {
        const progress = Math.floor(loaded * 100 / total);
        this.logger.debug(LogTag.L_UPLOAD_FILE_O, `${transactionId}, progress: ${progress}`);
        // Dispatch a progress event.
        if (msg.progress !== progress) {
          msg.progress = progress;
          this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [msg]));
        }
      }
      return this._uploadQueue.push({ message: msg, transactionId: msg.transactionId!, onProgress })
    });
    for (let uploadPromise of promises) {
      // Await uploads sequentially to preserve send order.
      const { isOk, data } = await uploadPromise;

      const { message } = data!;

      if (!isOk) {
        // Update message state.
        message.progress = -1;
        message.sentStatus = SentStatus.FAILED;
        // Dispatch a message state change event.
        this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [message]));
        continue;
      }

      // Clear the file reference.
      message.file = undefined;
      message.content.remoteUrl = data!.httpUrl;
      message.progress = 100;

      // Stop processing if the message was removed from the list.
      const index = cached.histories.findIndex((item) => item.transactionId === message.transactionId);
      if (index === -1) {
        continue;
      }

      const httpUrl = data!.httpUrl!;
      this._updateHttpUrl(message, httpUrl);

      // Add messages to the sending queue in order.
      this._push2SendQueue(channelIdentifier, message, sendParamMap.get(message)!);
    }
  }

  private _updateHttpUrl(message: ChatUIMessageModel, httpUrl: string): void {
    switch (message.messageType) {
      case MessageType.IMAGE:
        message.content.imageUri = httpUrl;
        break;
      case MessageType.GIF:
        message.content.remoteUrl = httpUrl;
        break;
      case MessageType.SHORT_VIDEO:
        message.content.sightUrl = httpUrl;
        break;
      case MessageType.COMBINE:
        message.content.remoteUrl = httpUrl;
        break
      default:
        message.content.fileUrl = httpUrl;
        break;
    }
  }

  /**
   * Send file messages in batches. Decodable videos up to one minute are sent as video messages; all others remain file messages.
   */
  public sendFiles = this._sendMultiMediaMessage.bind(this, parseFiles);

  /**
   * Send image messages in batches.
   */
  public sendImages = this._sendMultiMediaMessage.bind(this, parseFiles);

  /**
   * Insert a local message without sending it to the server.
   * @param message - Message.
   * @description - Server-received messages cannot be inserted directly because they may create gaps in the message cache.
   */
  async insertMessage<T extends Record<string, any>>(message: Message<T>): Promise<NCResult> {
    if (!(message instanceof Message) || !message.isPersisted) {
      return NCResult.fail(NCChatUICode.INVALID_MESSAGE);
    }

    const { channelIdentifier } = message;

    if (isInvalidChannel(channelIdentifier) || !isDirectChannelOrGroupChannel(channelIdentifier)) {
      // Only direct and group channel messages can be inserted.
      return NCResult.fail(NCChatUICode.INVALID_CHANNEL);
    }

    const msg = new ChatUIMessageModel(message);
    msg.transactionId = this._createTransactionId();

    const cached = this._getOrCreateCache(channelIdentifier, msg.sentTime + 1, true, true);
    let index = findLastIndex(cached.histories, (item) => item.messageId === msg.messageId || item.clientId === msg.clientId);
    if (index !== -1) {
      cached.histories.splice(index, 1, msg);
    } else {
      index = findLastIndex(cached.histories, (item) => item.sentTime <= msg.sentTime);
      if (index === -1) {
        cached.histories.unshift(msg);
      } else {
        cached.histories.splice(index, 0, msg);
      }
    }
    // Notify the UI to update the message list.
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.INSERT_NEW_MESSAGES, [msg]));
    return NCResult.ok();
  }

  /**
   * Delete one message, using the recall API when eligible and the delete API otherwise.
   * @param message
   * @param isDeleteForAll Whether to recall the message.
   */
  async deleteMessage(
    message: ChatUIMessageModel,
    isDeleteForAll: boolean
  ): Promise<void> {
    return this._deleteMessages(message.channelIdentifier, [message], isDeleteForAll);
  }

  /**
   * Delete or recall messages in batches.
   * @param channelIdentifier
   * @param messages
   * @param isDeleteForAll Whether to recall the messages.
   */
  private async _deleteMessages(
    channelIdentifier: ChannelIdentifier,
    messages: ChatUIMessageModel[],
    isDeleteForAll: boolean
  ): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    // Keep sent or failed messages; sending messages cannot be recalled or deleted.
    const sentList: ChatUIMessageModel[] = [];
    const failedList: ChatUIMessageModel[] = [];
    messages.forEach((message) => {
      if (message.messageId) {
        sentList.push(message);
      } else if (message.sentStatus === SentStatus.FAILED) {
        failedList.push(message);
      }
    });

    const history = this._getExistCache(channelIdentifier);


    // Track recalled and deleted messages separately.
    const deletedList: DeleteMessageData[] = [];

    // Recall sent messages when requested; otherwise call only the delete API.
    if (sentList.length) {
      const succeedList = await this._handleSentList(isDeleteForAll, history, sentList, channelIdentifier);
      deletedList.push(...succeedList);
    }

    // Delete failed messages directly from the local cache and database.
    if (failedList.length && history && history.histories.length) {
      failedList.forEach((message) => {
        // Failed messages lack messageUid, so match them by messageId or transactionId.
        const index = history.histories.findIndex((item) => {
          if (item.messageId) {
            return item.messageId === message.messageId
          }
          return item.transactionId === message.transactionId
        });
        if (index !== -1) {
          const [target] = history.histories.splice(index, 1);
          deletedList.push({
            channelIdentifier,
            messageId: target.messageId,
            transactionId: target.transactionId,
          });
        }
      });
    }

    // Notify the UI that messages were recalled.
    if (deletedList.length) {
      this.ctx.dispatchEvent(new ChatUIEvent(ChatUIEvents.MESSAGES_DELETED, deletedList));
    }
  }

  getAllowedToRecallTime(): number {
    return this.ctx.allowedToRecallTime;
  }

  private async _handleSentList(
    isDeleteForAll: boolean,
    history: IChatUIMessagesCacheData | undefined,
    models: ChatUIMessageModel[],
    channelIdentifier: ChannelIdentifier
  ): Promise<DeleteMessageData[]> {
    const reqSuccess: ChatUIMessageModel[] = [];
    const reqFailed: ChatUIMessageModel[] = [];
    /** Successfully deleted or recalled messages. */
    const succeed: DeleteMessageData[] = [];

    const channel = createNexconnChannel(channelIdentifier);
    if (!channel) {
      return succeed;
    }

    if (isDeleteForAll) {
      const list = await Promise.all(models.map((model) => {
        return channel.deleteMessageForAll(model.message);
      }));
      list.forEach((res, index) => {
        if (res.isOk) {
          reqSuccess.push(models[index]);
          return;
        }
        reqFailed.push(models[index]);
      });
    } else {
      const res = await channel.deleteMessagesForMe(models.map((item) => item.message));
      if (res.code === NCChatUICode.SUCCESS) {
        reqSuccess.push(...models);
      } else {
        reqFailed.push(...models);
      }
    }
    // Process successfully recalled or deleted messages.
    if (reqSuccess.length && history && history.histories.length) {
      reqSuccess.forEach((message) => {
        const index = history.histories.findIndex((item) => item.messageId === message.messageId);
        // Delete from the local cache.
        const [target] = history.histories.splice(index, 1);
        succeed.push({ channelIdentifier, messageId: target.messageId, transactionId: target.transactionId });
      })
    }

    // Ignore deletion failures; local data is removed only after remote deletion succeeds.
    if (reqFailed.length) {
      // Report that some messages could not be deleted.
      this.ctx.alert('alert.delete.messages.partial.failure', reqFailed.length);
    }
    return succeed;
  }

  /**
   * Forward messages individually to the specified channel.
   * @param channelIdentifier
   * @param messages
   * @description - Intended only for UI use; parameters do not require validation here.
   */
  async forward(channelIdentifier: ChannelIdentifier, messages: ChatUIMessageModel[]) {
    if (messages.length === 0) {
      return;
    }

    // Update message content and state.
    const paramsList: SendMessageParams[] = messages.map((item) => {
      const { content, messageType } = item.message;
      // Remove mentionedInfo, user, extra, and similar fields so forwarding is not interpreted as a mention.
      const { mentionedInfo, senderUserInfo, extra, ...rest } = content as TextMessageContent;
      const params: SendMessageParams = new SendMessageParams(rest, messageType);
      return params;
    });
    // Add the message to the sending queue.
    paramsList.forEach((params) => this.sendMessage(channelIdentifier, params));
  }

  /**
   * Send a combined forwarded message.
   * @param channelIdentifier
   * @param messages
   */
  public async sendCombineMessage(channelIdentifier: ChannelIdentifier, messages: ChatUIMessageModel[]): Promise<void> {
    if (messages.length === 0 || isInvalidChannel(channelIdentifier)) {
      return;
    }

    // Source channel.
    const { channelIdentifier: fromChannelIdentifier } = messages[0];

    const summaryList: string[] = [];
    const currentUserId = this.ctx.userId;
    const currentUsername = this.ctx.appData.getUserProfile(currentUserId)!.name;

    // For direct-channel forwarding, nameList contains both users; for groups, it contains the group name.
    const nameList: string[] = [];

    if (fromChannelIdentifier.channelType === ChannelType.DIRECT) {
      // For direct channels, add names to nameList based on each message senderUserId.
      const selfIndex = messages.findIndex(item => item.senderUserId === currentUserId);
      const otherIndex = messages.findIndex(item => item.senderUserId !== currentUserId);
      if (selfIndex > -1) {
        nameList.push(currentUsername);
      }
      if (otherIndex > -1) {
        nameList.push(this.ctx.appData.getUserProfile(fromChannelIdentifier.channelId)!.name);
      }
    } else {
      nameList.push(this.ctx.appData.getGroupProfile(fromChannelIdentifier.channelId)!.name)
    }

    const msgList: CombineMessageInfo[] = messages.map((message, index) => {
      const { senderUserId } = message;

      // Record summary data.
      if (index < 4) {
        const username = this.ctx.appData.getUserProfile(senderUserId)!.name;
        let desc: string = getMessageDesc(message);
        // File message summaries must include the file name.
        if (message.messageType === MessageType.FILE) {
          const fileName = (message.content as FileMessageContent).name;
          desc = `${desc}${fileName}`;
        }
        summaryList.push(`${username}: ${desc}`.substring(0, 1000));
      }

      const info: CombineMessageInfo = Helper.wrapAsCombineMessageInfo(message.message);
      return info;
    });

    const combineMsgContent: CombineMessageContent = {
      summaryList,
      nameList,
      channelType: fromChannelIdentifier.channelType,
      msgNum: msgList.length,
    };

    const jsonStr = JSON.stringify(msgList);
    if (jsonStr.length >= 120 * 1024) {
      // Send the file.
      const jsonMsgKey = `${Date.now()}-${Math.floor(Math.random() * Date.now())}.json`
      combineMsgContent.jsonMsgKey = jsonMsgKey;
      const file = new File([jsonStr], jsonMsgKey, { type: 'application/json' });
      this._sendMultiMediaMessage(
        async (file) => NCResult.ok(new SendMessageParams(combineMsgContent, MessageType.COMBINE)),
        channelIdentifier,
        [file]
      );
    } else {
      combineMsgContent.msgList = msgList;
      this.sendMessage(
        channelIdentifier,
        new SendMessageParams(combineMsgContent, MessageType.COMBINE),
      );
    }
  }

  private async _push2SendQueue(
    channelIdentifier: ChannelIdentifier,
    message: ChatUIMessageModel,
    params: SendMessageParams
  ) {
    const { isOk, data } = await this._sendQueue.push({
      channelIdentifier,
      message,
      transactionId: message.transactionId!,
      params,
    });


    if (!isOk) {
      message.sentStatus = SentStatus.FAILED;
    } else {
      const oldTime = message.sentTime;
      this._updateCachedMessage(message, data!);
      if (message.sentTime !== oldTime) {
        const cached = this._getExistCache(channelIdentifier);
        if (cached) {
          // Move the message from its old position to the correct one without sorting the full list.
          const index = cached.histories.findIndex(item => item.transactionId === message.transactionId);
          if (index !== -1) {
            cached.histories.splice(index, 1);
            const insertIndex = findLastIndex(cached.histories, (item) => item.sentTime <= message.sentTime);
            cached.histories.splice(insertIndex + 1, 0, message);
          }
        }
      }
    }

    // Notify the UI to update the message list.
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [message]));
  }

  removeCachedMessages(channelIdentifier: ChannelIdentifier): void {
    this._histories.delete(trans2ChannelKey(channelIdentifier));
  }

  /**
   * Cancel message upload and sending, then delete the local cached message.
   * @param message
   */
  cancelMessageSent(message: ChatUIMessageModel): void {
    const { transactionId } = message;
    const cached = this._getExistCache(message.channelIdentifier);
    if (!cached) {
      return;
    }

    const index = cached.histories.findIndex((item) => item.transactionId === transactionId);
    const cachedMessage = cached.histories[index];
    if (
      !cachedMessage // The cached message does not exist.
      || cachedMessage.sentStatus !== SentStatus.SENDING // Ignore sent or failed messages.
      || typeof cachedMessage.transactionId !== 'number' // Ignore messages without a transactionId.
    ) {
      return;
    }

    // Delete from the local cache.
    cached.histories.splice(index, 1);
    // Notify the UI to delete the message.
    this.ctx.dispatchEvent(new ChatUIEvent(ChatUIEvents.MESSAGES_DELETED, [{
      channelIdentifier: message.channelIdentifier,
      messageId: message.messageId,
      transactionId: message.transactionId,
    }]));

    // Cancel from either queue; a task cannot exist in both, so logical OR is sufficient.
    this._uploadQueue.remove(transactionId!) || this._sendQueue.remove(transactionId!);
  }

  /**
   * Resend a failed message.
   * @param message
   */
  async resendMessage(message: ChatUIMessageModel): Promise<void> {
    const { transactionId } = message;
    const cached = this._getExistCache(message.channelIdentifier);
    if (!cached) {
      return;
    }

    const cachedMessageIndex = cached.histories.findIndex((item) => item.transactionId === transactionId);
    const cachedMessage = cached.histories[cachedMessageIndex];
    if (
      !cachedMessage // The cached message does not exist.
      || cachedMessage.sentStatus !== SentStatus.FAILED // Ignore messages that are not failed.
      || typeof transactionId !== 'number' // Ignore messages without a transactionId.
    ) {
      return;
    }

    // Update message state.
    cachedMessage.sentStatus = SentStatus.SENDING;

    if (cachedMessage.file && cachedMessage.progress !== 100) {
      cachedMessage.progress = 0;
      // Dispatch an event to update UI state.
      this.ctx.emit(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cachedMessage]));

      // Upload the file again.
      const onProgress = (loaded: number, total: number) => {
        const progress = Math.floor(loaded * 100 / total);
        if (cachedMessage.progress !== progress) {
          cachedMessage.progress = progress;
          this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cachedMessage]));
        }
      }
      const { code, data } = await this._uploadQueue.push({ message: cachedMessage, transactionId, onProgress });
      if (code !== NCChatUICode.SUCCESS) {
        cachedMessage.sentStatus = SentStatus.FAILED;
        cachedMessage.progress = -1;
        // Dispatch an event to update UI state.
        this.ctx.emit(new ChatUIEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cachedMessage]));
        return;
      }

      cachedMessage.file = undefined;
      this._updateHttpUrl(cachedMessage, data!.httpUrl!);
    }

    const params = new SendMessageParams(cachedMessage.content, cachedMessage.messageType);
    this.emitMessageWillSend(cachedMessage.channelIdentifier, params);
    const sentMessage = Helper.createMessage(cachedMessage.channelIdentifier, params);
    const resentMessage = new ChatUIMessageModel(sentMessage);
    resentMessage.transactionId = cachedMessage.transactionId;
    resentMessage.sentTime = cachedMessage.sentTime;
    resentMessage.sentStatus = cachedMessage.sentStatus;
    resentMessage.progress = cachedMessage.progress;
    resentMessage.file = cachedMessage.file;
    resentMessage.readReceiptInfo = cachedMessage.readReceiptInfo;
    cached.histories.splice(cachedMessageIndex, 1, resentMessage);

    // Add the message to the sending queue.
    this._push2SendQueue(
      resentMessage.channelIdentifier,
      resentMessage,
      params,
    );
  }

  /**
   * Send a receipt.
   * @param channelIdentifier
   * @param list
   * @param isStart Whether to include startMsgId for online Web message receipt.
   * @returns
   */
  async sendReadReceiptMessage(
    channelIdentifier: ChannelIdentifier,
    list: ChatUIMessageModel[]
  ): Promise<void> {
    if (this.ctx.isReadReceiptV5) {
      this._sendReadReceiptMessageV5(channelIdentifier, list);
    }
  }

  /**
   * Get the latest message in a channel.
   */
  getLatestMessage(channelIdentifier: ChannelIdentifier): ChatUIMessageModel | null {
    const cached = this._getExistCache(channelIdentifier);
    if (!cached) {
      return null;
    }
    const length = cached.histories.length;
    return cached.histories[length - 1];
  }
}
