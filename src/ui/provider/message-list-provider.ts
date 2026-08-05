import { LitElement, html, css, nothing } from 'lit';
import { state, query } from 'lit/decorators.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { BaseChannel, ChannelIdentifier, ChannelType, MessageDirection, MessageReadReceiptStatus, MessagesReadReceiptUsersQuery, TextMessageContent } from '@nexconn/chat';
import {
  ctx, multiChoiceMode, replyMessage, selectedMessageUids,
  openedChannel as opened, selectedGroupMembers, currentUserProfile,
  getMessageComponentTag, isGreyMessage, selected, messageList, forwarding,
  handleShowSentStatus, unreadCountBottom,
} from './context';
import { I18nController } from '../i18n';
import { SignalController } from '../SignalController';
import { LanguagePackEntries } from '../../languages';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { MessageBubbleConfig, BubbleLayout } from '../../modules/BubbleModule';
import {
  formatTime, findLastIndex, createScrollControl, isMobileDevice,
  trans2ChannelKey,
} from '../../helper';
import { MessageMenuID } from '../../modules/MessageMenu';
import { CHECKED_ICON, SENT_STATUS_FAILED_ICON } from '../../assets';
import {
  ChannelSelectedEvent, MessagesDeletedEvent,
  InnerEvent, InsertNewMessagesEvent, MessageLinckClick, MessageStateChangeEvent, ChatUIEvents,
  ModalForwardingType, RecvNewMessagesEvent, SpeechToTextStateChangeEvent,
} from '@lib/core/EventDefined';
import {
  MessageType, SentStatus, MessageReadReceiptUser,
} from '@nexconn/chat';
import { NCChatUICode } from '@lib/enums/NCChatUICode';

type IUIMessage = string | ChatUIMessageModel;

export class MessageListProvider extends LitElement {
  private i18n = new I18nController(this);
  private _signalController = new SignalController(this, [messageList, multiChoiceMode, selectedMessageUids, opened]);

  @query('.nc-chatui-msg-list') private declare messageViewportEl: HTMLElement | undefined;
  @query('.nc-chatui-msg-list-scroll') private declare messageListEl: HTMLElement | undefined;
  @query('.nc-message-list-menu') private declare messageMenuEl: HTMLElement | undefined;
  @query('.nc-chatui-select') private declare selectEl: HTMLElement | undefined;
  @query('.nc-chatui-msg-list-scroll > div') private declare messageBoxEl: HTMLElement | undefined;

  @state() private declare hoveredMessageId: string;
  @state() private declare sttStatusMap: Record<string, 'converting' | 'success' | 'error'>;
  @state() private declare sttTextMap: Record<string, string>;
  @state() private declare sttHiddenMap: Record<string, boolean>;
  @state() private declare sttErrorCodeMap: Record<string, number>;
  @state() private declare unreadCountTop: number;
  @state() private declare ratioY: number;
  @state() private declare sizeHeight: number;
  @state() private declare moveY: number;
  @state() private declare onBottomArea: boolean;
  @state() private declare showScrollbar: boolean;
  @state() private declare isHoveringScrollbar: boolean;
  @state() private declare msgMenu: Array<{ id: string; icon: string; label: string; message: ChatUIMessageModel }>;
  @state() private declare messageMenuDisplay: 'block' | 'none';
  @state() private declare messageMenuTop: number;
  @state() private declare messageMenuLeft: number;
  @state() private declare currentSelectMessage: ChatUIMessageModel | undefined;
  @state() private declare isH5: boolean;
  @state() private declare showReadReceiptModal: boolean;
  @state() private declare readReceiptMessage: ChatUIMessageModel | null;
  @state() private declare readUsers: MessageReadReceiptUser[];
  @state() private declare unreadUsers: MessageReadReceiptUser[];
  @state() private declare readHasMore: boolean;
  @state() private declare unreadHasMore: boolean;
  @state() private declare readLoading: boolean;
  @state() private declare unreadLoading: boolean;
  @state() private declare readReceiptPositionTop: number;
  @state() private declare readReceiptPositionLeft: number;
  @state() private declare readReceiptAnchor: string;
  @state() private declare messageBubbleCfg: MessageBubbleConfig | undefined;
  @state() private declare hasMoreBackward: boolean;
  @state() private declare multiChoice: boolean;
  @state() private declare selectedUids: string[];
  @state() private declare showReadReceiptModalMessageUId: string;

  private readQuery: MessagesReadReceiptUsersQuery | null = null;
  private unreadQuery: MessagesReadReceiptUsersQuery | null = null;

  private scrollControl: ReturnType<typeof createScrollControl> | null = null;
  private scrollbarHideTimer: any = null;
  private resizeRefObserver: ResizeObserver | null = null;
  private hasMoreForward = true;
  private firstUnreadMessageTime = 0;
  private backupFirstUnreadMessageTime = 0;
  private timer: any = null;
  private readReceiptStatusElement: HTMLElement | null = null;
  /** Bottom snap slack for media or input-area growth. Keep it near onBottom to avoid disrupting manual browsing. */
  private readonly MEDIA_LOAD_SCROLL_SLACK_PX = 100;

  private readonly weeklist: Array<keyof LanguagePackEntries> = [
    'time.format.sunday', 'time.format.monday', 'time.format.tueday',
    'time.format.wedday', 'time.format.thurday', 'time.format.friday', 'time.format.satday',
  ];

  private _onSelectedChanged = (e: ChannelSelectedEvent) => this.onSelectedChanged(e);
  private _onRecvNewMessages = (e: RecvNewMessagesEvent) => this.onRecvNewMessages(e);
  private _onInsertNewMessages = (e: InsertNewMessagesEvent) => this.onInsertNewMessages(e);
  private _onDeleteMessages = (e: MessagesDeletedEvent) => this.onDeleteMessages(e);
  private _onMessageStateChange = (e: MessageStateChangeEvent) => this.onMessageStateChange(e);
  private _onSpeechToTextStateChange = (e: SpeechToTextStateChangeEvent) => this.onSpeechToTextStateChange(e);
  private _onAdjustMessageListScroll = () => this.handleAdjustMessageListScroll();
  private _hideMsgMenu = () => this.hideMsgMenu();
  private _handleClickOutside = (e: MouseEvent) => this.handleClickOutside(e);
  private _checkDevice = () => this.checkDevice();
  private _updateScrollbar = () => this.updateScrollbar();

  private get FOCUS_ON_LATEST_MESSAGE(): boolean {
    // return ctx().store.getCommandSwitch(ChatUICommand.FOCUS_ON_LATEST_MESSAGE);
    return true;
  }

  private get messageRenderList(): IUIMessage[] {
    const list = messageList.value;
    const result: IUIMessage[] = [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      result.unshift(item);
      const before = list[i - 1];
      if (before) {
        if (new Date(item.sentTime).toDateString() !== new Date(before.sentTime).toDateString()) {
          result.unshift(this.handleTimeFilter(item.sentTime));
        }
      } else {
        if (!this.hasMoreForward) {
          result.unshift(this.handleTimeFilter(item.sentTime));
        }
      }
    }
    return result;
  }

  connectedCallback() {
    super.connectedCallback();
    const context = ctx();
    this.hoveredMessageId = '';
    this.sttStatusMap = {};
    this.sttTextMap = {};
    this.sttHiddenMap = {};
    this.sttErrorCodeMap = {};
    this.unreadCountTop = 0;
    this.ratioY = 1;
    this.sizeHeight = 0;
    this.moveY = 0;
    this.onBottomArea = true;
    this.showScrollbar = false;
    this.isHoveringScrollbar = false;
    this.msgMenu = [];
    this.messageMenuDisplay = 'none';
    this.messageMenuTop = 0;
    this.messageMenuLeft = 0;
    this.currentSelectMessage = undefined;
    this.isH5 = false;
    this.showReadReceiptModal = false;
    this.readReceiptMessage = null;
    this.readUsers = [];
    this.unreadUsers = [];
    this.readQuery = null;
    this.unreadQuery = null;
    this.readHasMore = false;
    this.unreadHasMore = false;
    this.readLoading = false;
    this.unreadLoading = false;
    this.readReceiptPositionTop = 0;
    this.readReceiptPositionLeft = 0;
    this.readReceiptAnchor = 'top-right';
    this.messageBubbleCfg = undefined;
    this.hasMoreBackward = false;
    this.multiChoice = false;
    this.selectedUids = [];
    this.showReadReceiptModalMessageUId = '';

    window.addEventListener('click', this._hideMsgMenu);
    window.addEventListener('click', this._handleClickOutside);
    this.checkDevice();
    window.addEventListener('resize', this._checkDevice);
    window.addEventListener('resize', this._updateScrollbar);
    context.addEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onSelectedChanged);
    context.addEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
    context.addEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages);
    context.addEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
    context.addEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange);
    context.addEventListener(InnerEvent.SPEECH_TO_TEXT_STATE_CHANGE, this._onSpeechToTextStateChange);
    context.addEventListener(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL, this._onAdjustMessageListScroll);
    this.messageBubbleCfg = context.bubble.messageBubbleCfg;
  }

  firstUpdated() {
    if (this.messageListEl) {
      this.scrollControl = createScrollControl({ value: this.messageListEl });
      this.resizeRefObserver = this._useResizeObserver(this.messageListEl, () => this.handleResizeRef());
    }
    this.initMessageList();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const context = ctx();
    this.scrollControl?.enableScroll();
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
    context.removeEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onSelectedChanged);
    context.removeEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
    context.removeEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages);
    context.removeEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
    context.removeEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange);
    context.removeEventListener(InnerEvent.SPEECH_TO_TEXT_STATE_CHANGE, this._onSpeechToTextStateChange);
    context.removeEventListener(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL, this._onAdjustMessageListScroll);
    window.removeEventListener('click', this._hideMsgMenu);
    window.removeEventListener('click', this._handleClickOutside);
    window.removeEventListener('resize', this._checkDevice);
    window.removeEventListener('resize', this._updateScrollbar);
    if (this.messageListEl) {
      this.resizeRefObserver?.unobserve(this.messageListEl);
    }
  }

  // ─── i18n helper ───────────────────────────────────────────────────────────
  private $tt(key: keyof LanguagePackEntries, ...args: Array<string | number>): string {
    return this.i18n.t(key, ...args);
  }

  // ─── STT ───────────────────────────────────────────────────────────────────
  private getSTTStatus(messageUId: string): 'converting' | 'success' | 'error' | undefined {
    return this.sttStatusMap[messageUId];
  }

  private getSTTText(messageUId: string): string {
    const text = this.sttTextMap[messageUId] || ctx().speechToTextStore.getSTTText(messageUId) || '';
    return text === '' ? this.$tt('message.speech.to.text.empty') : text;
  }

  private shouldShowSTTStatus(messageUId: string): boolean {
    if (this.sttHiddenMap[messageUId]) return false;
    const status = this.getSTTStatus(messageUId);
    if (status) return true;
    const text = ctx().speechToTextStore.getSTTText(messageUId);
    if (text) {
      this.sttStatusMap = { ...this.sttStatusMap, [messageUId]: 'success' };
      this.sttTextMap = { ...this.sttTextMap, [messageUId]: text };
      return true;
    }
    return false;
  }

  private onSpeechToTextStateChange(evt: SpeechToTextStateChangeEvent) {
    const { messageUId, status, text, errorCode } = evt.data;
    if (this.sttHiddenMap[messageUId]) return;
    this.sttStatusMap = { ...this.sttStatusMap, [messageUId]: status };
    if (errorCode) {
      this.sttErrorCodeMap = { ...this.sttErrorCodeMap, [messageUId]: errorCode };
    }
    if (status === 'success' && text) {
      this.sttTextMap = { ...this.sttTextMap, [messageUId]: text };
    }
  }

  // ─── Time filter ───────────────────────────────────────────────────────────
  private handleTimeFilter(time: number): string {
    const { year, month, day, weekDay } = formatTime(time)!;
    const interval = (Date.now() - time) / 1000 / 60 / 60 / 24;
    let name = this.$tt('time.format.full', year, month, day);
    if (new Date().toDateString() === new Date(time).toDateString()) {
      name = this.$tt('time.format.today');
    } else if ((new Date().toDateString() !== new Date(time).toDateString() && interval < 1) || (1 <= interval && interval < 2)) {
      name = this.$tt('time.format.yesterday');
    } else if (2 <= interval && interval < 7) {
      name = this.$tt(this.weeklist[weekDay]);
    }
    return name;
  }

  // ─── User profiles ─────────────────────────────────────────────────────────
  private handleUserProfiles(msg: ChatUIMessageModel): { name: string; nickname?: string; userId: string; avatarUrl: string } {
    if (msg.direction === MessageDirection.SEND) return currentUserProfile.value!;
    if (opened.value?.channelType === ChannelType.GROUP) {
      const value = selectedGroupMembers.value.find(item => item.userId === msg.senderUserId);
      return value || { name: msg.senderUserId, userId: msg.senderUserId, avatarUrl: opened.value?.avatarUrl };
    }
    return { name: opened.value!.name, userId: opened.value!.channelId, avatarUrl: opened.value!.avatarUrl };
  }

  private handleIconClick(msg: ChatUIMessageModel) {
    const profile = this.handleUserProfiles(msg);
    ctx().emit(new ChatUIEvent(ChatUIEvents.CHANNEL_ICON_CLICK, {
      channelIdentifier: msg.channelIdentifier,
      profile,
    }));
  }

  // ─── Bubble config ─────────────────────────────────────────────────────────
  private showAvatar(_message: ChatUIMessageModel, _before: IUIMessage): boolean {
    return true;
  }

  private bubbleShowPortrait(item: ChatUIMessageModel): boolean {
    const cfg = this.messageBubbleCfg;
    if (item.direction === MessageDirection.SEND && item.channelType === ChannelType.DIRECT) return !!cfg?.showMyProfileInDirectionChannel;
    if (item.direction === MessageDirection.SEND && item.channelType === ChannelType.GROUP) return !!cfg?.showMyProfileInGroupChannel;
    if (item.direction === MessageDirection.RECEIVE && item.channelType === ChannelType.DIRECT) return !!cfg?.showOthersProfileInDirectionChannel;
    if (item.direction === MessageDirection.RECEIVE && item.channelType === ChannelType.GROUP) return !!cfg?.showOthersProfileInGroupChannel;
    return false;
  }

  private bubbleShowName(item: ChatUIMessageModel): boolean {
    const cfg = this.messageBubbleCfg;
    if (item.direction === MessageDirection.SEND && item.channelType === ChannelType.DIRECT) return !!cfg?.showMyNameInDirectionChannel;
    if (item.direction === MessageDirection.SEND && item.channelType === ChannelType.GROUP) return !!cfg?.showMyNameInGroupChannel;
    if (item.direction === MessageDirection.RECEIVE && item.channelType === ChannelType.DIRECT) return !!cfg?.showOthersNameInDirectionChannel;
    if (item.direction === MessageDirection.RECEIVE && item.channelType === ChannelType.GROUP) return !!cfg?.showOthersNameInGroupChannel;
    return false;
  }

  private bubbleDirection(item: ChatUIMessageModel): string {
    if (item.direction === 1 && this.messageBubbleCfg?.layout === BubbleLayout.LEFT_RIGHT) return 'row-reverse';
    return 'row';
  }

  private bubbleColorStyle(item: ChatUIMessageModel, _showAvatar: boolean): Record<string, string> | undefined {
    const cfg = this.messageBubbleCfg;
    if (!cfg) return undefined;
    const textColorForOthers = Number(cfg.textColorForOthers);
    const backgroundColorForOthers = Number(cfg.backgroundColorForOthers);
    const textColorForMyself = Number(cfg.textColorForMyself);
    const backgroundColorForMyself = Number(cfg.backgroundColorForMyself);
    let color = `#${textColorForOthers.toString(16).padStart(6, '0')}`;
    let backgroundColor = `#${backgroundColorForOthers.toString(16).padStart(6, '0')}`;
    let borderRadius = `${cfg.redius}px`;
    if (item.direction === MessageDirection.SEND) {
      color = `#${textColorForMyself.toString(16).padStart(6, '0')}`;
      backgroundColor = `#${backgroundColorForMyself.toString(16).padStart(6, '0')}`;
    }
    if ([MessageType.IMAGE, MessageType.SHORT_VIDEO, MessageType.GIF].includes(item.messageType as any)) {
      backgroundColor = backgroundColor + '00';
    }
    return { color, backgroundColor, borderRadius };
  }

  private bubbleStyleAlign(item: ChatUIMessageModel): boolean {
    return !!(item.direction === 1 && this.messageBubbleCfg?.layout === 'left-right');
  }

  private handleBubbleClick(item: ChatUIMessageModel) {
    if (item.sentStatus === SentStatus.SENDING || item.sentStatus === SentStatus.FAILED) return;
    const context = ctx();
    switch (item.messageType) {
      case MessageType.IMAGE:
        context.emit(new ChatUIEvent(ChatUIEvents.MEDIA_MESSAGE_MODAL_EVENT, item)); break;
      case MessageType.SHORT_VIDEO:
        context.audioPlayer.pause();
        context.emit(new ChatUIEvent(ChatUIEvents.MEDIA_MESSAGE_MODAL_EVENT, item)); break;
      case MessageType.GIF:
        context.emit(new ChatUIEvent(ChatUIEvents.MEDIA_MESSAGE_MODAL_EVENT, item)); break;
      case MessageType.COMBINE:
        context.emit(new ChatUIEvent(ChatUIEvents.COMBINE_MESSAGE_MODAL_EVENT, item)); break;
    }
  }

  private handleLinkClick(data: CustomEvent) {
    const detail = data.detail as MessageLinckClick | MessageLinckClick[];
    const payload = Array.isArray(detail) ? detail[0] : detail;
    ctx().emit(new ChatUIEvent(ChatUIEvents.MESSAGE_LINK_CLICK, payload));
  }

  // ─── Right-click menu ──────────────────────────────────────────────────────
  private calculateTop(menuHeight: number, clientY: number): number {
    if (!this.messageViewportEl) return 0;
    const containerRect = this.messageViewportEl.getBoundingClientRect();
    const relativeY = clientY - containerRect.top;
    return containerRect.height - relativeY < menuHeight ? relativeY - menuHeight : relativeY;
  }

  private calculateLeft(menuWidth: number, clientX: number): number {
    if (!this.messageViewportEl) return 0;
    const containerRect = this.messageViewportEl.getBoundingClientRect();
    const relativeX = clientX - containerRect.left;
    return containerRect.width - relativeX < menuWidth ? relativeX - menuWidth : relativeX;
  }

  private async handleMessageRightClick(message: ChatUIMessageModel, e: MouseEvent | CustomEvent) {
    if (multiChoiceMode.value) return;
    this.handleCloseReadReceiptModal();

    let mouseEvent = e as MouseEvent;
    if ('detail' in e && Array.isArray(e.detail) && e.detail[0] instanceof MouseEvent) {
      mouseEvent = e.detail[0];
    }

    this.currentSelectMessage = message;
    const context = ctx();

    let list = context.msgMenu.getMenu(message).map((item) => ({
      id: item.id,
      icon: item.icon,
      label: this.$tt(item.id as keyof LanguagePackEntries),
      message,
    }));

    if (message.messageType === MessageType.HD_VOICE && message.messageId) {
      const shouldShow = this.shouldShowSTTStatus(message.messageId);
      const sttIndex = list.findIndex(item =>
        item.id === MessageMenuID.SPEECH_TO_TEXT || item.id === MessageMenuID.CANCEL_SPEECH_TO_TEXT
      );
      if (sttIndex !== -1) {
        list[sttIndex] = {
          id: shouldShow ? MessageMenuID.CANCEL_SPEECH_TO_TEXT : MessageMenuID.SPEECH_TO_TEXT,
          icon: list[sttIndex].icon,
          label: this.$tt((shouldShow ? MessageMenuID.CANCEL_SPEECH_TO_TEXT : MessageMenuID.SPEECH_TO_TEXT) as keyof LanguagePackEntries),
          message,
        };
      }
    }

    this.msgMenu = list;
    this.messageMenuDisplay = 'block';
    this.messageMenuLeft = this.calculateLeft(this.messageMenuEl?.clientWidth || 0, mouseEvent.clientX);
    await this.updateComplete;
    this.messageMenuTop = this.calculateTop(this.messageMenuEl?.clientHeight || 0, mouseEvent.clientY);
    this.messageMenuLeft = this.calculateLeft(this.messageMenuEl?.clientWidth || 0, mouseEvent.clientX);

    if (this.messageMenuDisplay === 'block') {
      this.scrollControl?.disableScroll();
    }
  }

  private async handleMenuItemClick(menuId: string, message: ChatUIMessageModel) {
    const context = ctx();
    switch (menuId) {
      case MessageMenuID.COPY: {
        const text = (message.content as TextMessageContent).text || '';
        if (!navigator.clipboard || !text) return;
        navigator.clipboard.writeText(text);
        context.emit(new ChatUIEvent(ChatUIEvents.TOAST_EVENT, { message: context.i18n.format('toast.copy.success'), showIcon: true }));
        break;
      }
      case MessageMenuID.DELETE_FOR_ME:
        context.message.deleteMessage(message, false); break;
      case MessageMenuID.DELETE_FOR_ALL:
        context.message.deleteMessage(message, true); break;
      case MessageMenuID.MULIT_CHOICE:
        multiChoiceMode.value = true; break;
      case MessageMenuID.REPLY:
        replyMessage.value = message; break;
      case MessageMenuID.FORWARD:
        forwarding(ModalForwardingType.SINGLE, [message]); break;
      case MessageMenuID.SPEECH_TO_TEXT:
        if (message.messageId) {
          const newHidden = { ...this.sttHiddenMap };
          delete newHidden[message.messageId];
          this.sttHiddenMap = newHidden;
          const hasConverted = context.speechToTextStore.hasConverted(message.messageId);
          if (hasConverted) {
            const cachedText = context.speechToTextStore.getSTTText(message.messageId) || '';
            this.sttStatusMap = { ...this.sttStatusMap, [message.messageId]: 'success' };
            this.sttTextMap = { ...this.sttTextMap, [message.messageId]: cachedText };
          } else {
            this.sttStatusMap = { ...this.sttStatusMap, [message.messageId]: 'converting' };
            await context.speechToTextStore.requestForMessage(message);
          }
        }
        break;
      case MessageMenuID.CANCEL_SPEECH_TO_TEXT:
        if (message.messageId) {
          this.sttHiddenMap = { ...this.sttHiddenMap, [message.messageId]: true };
          const newStatus = { ...this.sttStatusMap };
          const newText = { ...this.sttTextMap };
          delete newStatus[message.messageId];
          delete newText[message.messageId];
          this.sttStatusMap = newStatus;
          this.sttTextMap = newText;
        }
        break;
      default:
        context.emit(new ChatUIEvent(ChatUIEvents.MESSAGE_MENU_ITEM_CLICK, { id: menuId, message }));
    }
  }

  private hideMsgMenu() {
    if (this.messageMenuDisplay !== 'none') {
      this.messageMenuDisplay = 'none';
      this.scrollControl?.enableScroll();
    }
  }

  private checkDevice() {
    this.isH5 = isMobileDevice();
  }

  private handleResendMessage(message: ChatUIMessageModel, event?: MouseEvent) {
    const context = ctx();
    if (message.sentStatus === SentStatus.FAILED) {
      context.message.resendMessage(message);
    } else if (
      message.channelType === ChannelType.GROUP &&
      (message.sentStatus === SentStatus.SENT || message.sentStatus === SentStatus.READ) &&
      context.isReadReceiptV5
    ) {
      this.showReadReceiptModalMessageUId = message.messageId;
      this.handleShowReadReceiptModal(message, event);
    }
  }

  // ─── Read receipt modal ────────────────────────────────────────────────────
  private updateReadReceiptPosition(statusElement: HTMLElement | null) {
    if (!this.messageListEl || !this.messageViewportEl) return;
    if (!statusElement) {
      if (this.readReceiptMessage?.messageId) {
        const messageItem = this.messageListEl.querySelector(`.nc-chatui-msg-list-item[data-message-uid="${this.readReceiptMessage.messageId}"]`) as HTMLElement;
        if (messageItem) {
          const foundElement = messageItem.querySelector('.nc-chatui-msg-sent-status') as HTMLElement ||
                               messageItem.querySelector('.nc-chatui-message-sent-status') as HTMLElement;
          if (foundElement) {
            this.readReceiptStatusElement = foundElement;
            statusElement = foundElement;
          } else return;
        } else return;
      } else return;
    }

    const rect = statusElement.getBoundingClientRect();
    const containerRect = this.messageViewportEl.getBoundingClientRect();
    const relativeTop = rect.top - containerRect.top;
    const relativeBottom = rect.bottom - containerRect.top;
    const relativeLeft = rect.left - containerRect.left;
    const relativeRight = rect.right - containerRect.left;
    const viewportCenter = containerRect.height / 2;
    const popoverWidth = 344;
    const statusIconSize = 20;
    const isInTopHalf = relativeTop < viewportCenter;
    const canFitOnRight = relativeRight + statusIconSize + popoverWidth <= containerRect.width;
    const canFitOnLeft = relativeLeft - popoverWidth >= 0;

    if (canFitOnRight) {
      if (isInTopHalf) {
        this.readReceiptPositionTop = relativeTop;
        this.readReceiptPositionLeft = relativeRight + statusIconSize;
        this.readReceiptAnchor = 'top-left';
      } else {
        this.readReceiptPositionTop = relativeBottom;
        this.readReceiptPositionLeft = relativeRight + statusIconSize;
        this.readReceiptAnchor = 'bottom-left';
      }
    } else if (canFitOnLeft) {
      if (isInTopHalf) {
        this.readReceiptPositionTop = relativeTop;
        this.readReceiptPositionLeft = relativeLeft;
        this.readReceiptAnchor = 'top-right';
      } else {
        this.readReceiptPositionTop = relativeBottom;
        this.readReceiptPositionLeft = relativeLeft;
        this.readReceiptAnchor = 'bottom-right';
      }
    } else {
      const containerCenter = containerRect.width / 2;
      if (isInTopHalf) {
        this.readReceiptPositionTop = relativeTop;
        this.readReceiptPositionLeft = containerCenter;
        this.readReceiptAnchor = 'top-center';
      } else {
        this.readReceiptPositionTop = relativeBottom;
        this.readReceiptPositionLeft = containerCenter;
        this.readReceiptAnchor = 'bottom-center';
      }
    }
  }

  private async handleShowReadReceiptModal(message: ChatUIMessageModel, event?: MouseEvent) {
    this.hideMsgMenu();
    if (!message.messageId || message.channelType !== ChannelType.GROUP) return;

    this.readReceiptMessage = message;
    this.readUsers = [];
    this.unreadUsers = [];
    this.readQuery = BaseChannel.createMessagesReadReceiptUsersQuery({
      channelIdentifier: message.channelIdentifier,
      pageSize: 15,
      messageId: message.messageId,
      status: MessageReadReceiptStatus.RESPONDED,
    });
    this.unreadQuery = BaseChannel.createMessagesReadReceiptUsersQuery({
      channelIdentifier: message.channelIdentifier,
      pageSize: 15,
      messageId: message.messageId,
      status: MessageReadReceiptStatus.UNRESPONDED,
    });
    this.readHasMore = false;
    this.unreadHasMore = false;

    await this.updateComplete;

    let statusElement: HTMLElement | null = null;
    if (event && event.target) {
      const target = event.target as HTMLElement;
      if (target && typeof target.closest === 'function') {
        statusElement = target.closest('.nc-chatui-msg-sent-status') || target.closest('.nc-chatui-message-sent-status');
      }
      if (!statusElement && target) {
        if (target.classList.contains('nc-chatui-msg-sent-status') || target.classList.contains('nc-chatui-message-sent-status')) {
          statusElement = target;
        }
      }
    }

    if (!statusElement) {
      const messageItem = this.messageListEl?.querySelector(`.nc-chatui-msg-list-item[data-message-uid="${message.messageId}"]`) as HTMLElement;
      if (messageItem) {
        statusElement = messageItem.querySelector('.nc-chatui-msg-sent-status') as HTMLElement ||
                        messageItem.querySelector('.nc-chatui-message-sent-status') as HTMLElement;
      }
    }

    if (statusElement) {
      this.readReceiptStatusElement = statusElement;
      this.updateReadReceiptPosition(statusElement);
    } else {
      this.readReceiptPositionTop = this.messageViewportEl ? this.messageViewportEl.clientHeight / 2 : 0;
      this.readReceiptPositionLeft = this.messageViewportEl ? this.messageViewportEl.clientWidth / 2 : 0;
      this.readReceiptAnchor = 'top-left';
    }

    await Promise.all([this.loadReadUsers(), this.loadUnreadUsers()]);
    this.showReadReceiptModal = true;
  }

  private async loadReadUsers() {
    if (this.readLoading) return;
    this.readLoading = true;
    const { data } = await this.readQuery!.loadNextPage();
    if (data) {
      this.readUsers = [...this.readUsers, ...(data.data || [])];
      this.readHasMore = this.readQuery!.hasNext
    }
    this.readLoading = false;
  }

  private async loadUnreadUsers() {
    if (this.unreadLoading) return;
    this.unreadLoading = true;
    const { data } = await this.unreadQuery!.loadNextPage();
    if (data) {
      this.unreadUsers = [...this.unreadUsers, ...(data.data || [])];
      this.unreadHasMore = this.unreadQuery!.hasNext
    }
    this.unreadLoading = false;
  }

  private async handleReadReceiptScroll(listScrollInfo: { scrollTop: number; scrollHeight: number; clientHeight: number }, type: 'read' | 'unread') {
    if (!this.readQuery || !this.unreadQuery) return;
    const { scrollTop, scrollHeight, clientHeight } = listScrollInfo;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (type === 'read' && this.readHasMore && !this.readLoading) {
        await this.loadReadUsers();
      } else if (type === 'unread' && this.unreadHasMore && !this.unreadLoading) {
        await this.loadUnreadUsers();
      }
    }
  }

  private onReadReceiptScroll(event: CustomEvent) {
    const [listScrollInfo, type] = event.detail as [{ scrollTop: number; scrollHeight: number; clientHeight: number }, 'read' | 'unread'];
    this.handleReadReceiptScroll(listScrollInfo, type);
  }

  private handleCloseReadReceiptModal() {
    this.showReadReceiptModal = false;
    this.readReceiptMessage = null;
    this.readUsers = [];
    this.unreadUsers = [];
    this.readQuery = null;
    this.unreadQuery = null;
    this.readHasMore = false;
    this.unreadHasMore = false;
    this.readReceiptStatusElement = null;
  }

  private handleClickOutside(e: MouseEvent) {
    if (this.showReadReceiptModal) {
      const target = e.target as HTMLElement;
      if (!target.closest('.read-receipt-popover')) {
        this.handleCloseReadReceiptModal();
      }
    }
  }

  // ─── Scroll logic ──────────────────────────────────────────────────────────
  private handleScrollbarEnter() {
    this.isHoveringScrollbar = true;
    this.showScrollbar = true;
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
  }

  private handleScrollbarLeave() {
    this.isHoveringScrollbar = false;
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
    this.scrollbarHideTimer = setTimeout(() => { this.showScrollbar = false; }, 1000);
  }

  private handleScroll() {
    if (this.scrollControl?.isScrollDisabled) return;
    this.showScrollbar = true;
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
    if (!this.isHoveringScrollbar) {
      this.scrollbarHideTimer = setTimeout(() => { this.showScrollbar = false; }, 1000);
    }
    if (!opened.value || messageList.value.length === 0) return;
    const el = this.messageListEl!;
    const { scrollHeight, scrollTop, clientHeight } = el;
    this.onBottomArea = (scrollHeight - clientHeight - scrollTop) <= 100;

    const originalHeight = el.offsetHeight ** 2 / scrollHeight;
    const height = Math.max(Math.floor(originalHeight * 100) / 100, 20);
    const ratio = (originalHeight / (el.offsetHeight - originalHeight)) / (height / (el.offsetHeight - height));
    this.ratioY = Math.floor(ratio * 100) / 100 || 1;
    this.moveY = ((el.scrollTop * 100) / clientHeight) * this.ratioY || 0;

    if (scrollTop <= 200 && !this.timer) {
      if (!this.hasMoreForward) return;
      this.timer = setTimeout(() => { void this.moreForward(opened.value!.channelIdentifier); }, 1000);
    }
    if (this.showReadReceiptModal) {
      this.updateReadReceiptPosition(this.readReceiptStatusElement);
    }
    if (this.hasMoreBackward && scrollHeight - scrollTop - clientHeight <= 200 && !this.timer) {
      this.timer = setTimeout(async () => { this.moreBackward(opened.value!.channelIdentifier, clientHeight); }, 1000);
    }
  }

  private async moreForward(identifier: ChannelIdentifier) {
    const { hasMore, code, list } = await ctx().message.reqHistories(
      identifier, messageList.value[0].sentTime, true
    );
    if (code === NCChatUICode.SUCCESS) {
      const el = this.messageListEl;
      if (!el) {
        this.timer = null;
        return;
      }
      /** Capture the baseline before prepending to preserve scrollTop and avoid stale dimensions in the one-second closure. */
      const scrollTopBefore = el.scrollTop;
      const scrollHeightBefore = el.scrollHeight;
      messageList.value = [...list, ...messageList.value];
      this.hasMoreForward = hasMore;
      if (this.unreadCountTop) {
        const count = this.unreadCountTop - list.length;
        this.unreadCountTop = count < 0 ? 0 : count;
      }
      await this.updateComplete;
      this.updateScrollbar();
      if (!this.messageListEl) {
        this.timer = null;
        return;
      }
      const hDelta = this.messageListEl.scrollHeight - scrollHeightBefore;
      this.messageListEl.scrollTop = Math.max(0, scrollTopBefore + hDelta);
      if (messageList.value.length > 300) {
        messageList.value = messageList.value.slice(0, 300);
        await this.updateComplete;
        this.updateScrollbar();
        this.hasMoreBackward = true;
        if (this.messageListEl) {
          const { scrollHeight, clientHeight } = this.messageListEl;
          this.messageListEl.scrollTop = Math.max(0, Math.min(this.messageListEl.scrollTop, Math.max(0, scrollHeight - clientHeight)));
        }
      }
    }
    this.timer = null;
  }

  private async moreBackward(identifier: ChannelIdentifier, offsetHeight: number) {
    const { hasMore, code, list } = await ctx().message.reqHistories(
      identifier, messageList.value[messageList.value.length - 1].sentTime, false
    );
    if (code === 0) {
      messageList.value = [...messageList.value, ...list];
      this.hasMoreBackward = hasMore;
      if (unreadCountBottom.value) {
        if (!hasMore) {
          await ctx().channelModule.clearUnreadCountByTimestamp(identifier);
          await ctx().message.sendReadReceiptMessage(identifier, list);
        }
      }
      await this.updateComplete;
      this.updateScrollbar();
      this.moveY = ((this.messageListEl!.scrollTop * 100) / offsetHeight) * this.ratioY || 0;
      const messageBoxOffsetHeight = this.messageBoxEl?.offsetHeight || 0;
      if (messageList.value.length > 300) {
        messageList.value = messageList.value.slice(-300);
        await this.updateComplete;
        this.updateScrollbar();
        this.messageListEl!.scrollTop = this.messageListEl!.scrollTop - (messageBoxOffsetHeight - (this.messageBoxEl?.offsetHeight || 0));
      }
    }
    this.timer = null;
  }

  private handleMove(e: CustomEvent) {
    if (this.scrollControl?.isScrollDisabled) return;
    if (!this.messageListEl) return;
    const thumbPositionPercentage = e.detail[0];
    this.messageListEl.scrollTop = (thumbPositionPercentage * this.messageListEl.scrollHeight) / 100;
  }

  private updateScrollbar() {
    if (!this.messageListEl) return;
    const original = this.messageListEl.offsetHeight ** 2 / this.messageListEl.scrollHeight;
    const originalHeight = Math.floor(original * 100) / 100;
    const height = Math.max(originalHeight, 20);
    const ratio = originalHeight / (this.messageListEl.offsetHeight - originalHeight) / (height / (this.messageListEl.offsetHeight - height));
    this.ratioY = Math.floor(ratio * 100) / 100 || 1;
    this.sizeHeight = originalHeight < this.messageListEl.offsetHeight ? Math.floor(height) : 0;
  }

  /** Match handleScroll by using clientHeight so height differences do not clip the last message. */
  private scrollMessageListToBottom() {
    if (!this.messageListEl) return;
    this.updateScrollbar();
    const el = this.messageListEl;
    const { scrollHeight, clientHeight } = el;
    el.scrollTop = Math.max(scrollHeight - clientHeight, 0);
    this.onBottomArea = true;
    const oh = el.offsetHeight;
    this.moveY = oh ? ((el.scrollTop * 100) / oh) * this.ratioY || 0 : 0;
  }

  /** Snap to the bottom again after child components or images increase scrollHeight asynchronously. */
  private scheduleScrollToBottomAfterPaint() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.scrollMessageListToBottom());
    });
  }

  private async setScroll2bottom() {
    await this.updateComplete;
    this.scrollMessageListToBottom();
    this.scheduleScrollToBottomAfterPaint();
  }

  private handleResizeRef() {
    if (!this.messageListEl) return;
    this.updateScrollbar();
    this.moveY = ((this.messageListEl.scrollTop * 100) / this.messageListEl.offsetHeight) * this.ratioY || 0;
  }

  private async handleAdjustMessageListScroll() {
    if (!this.messageListEl) return;
    await this.updateComplete;
    requestAnimationFrame(() => {
      if (!this.messageListEl) return;
      const el = this.messageListEl;
      const { scrollHeight, scrollTop, clientHeight } = el;
      const distFromBottom = scrollHeight - clientHeight - scrollTop;
      const shouldStick = this.onBottomArea || distFromBottom <= this.MEDIA_LOAD_SCROLL_SLACK_PX;
      if (!shouldStick) return;
      requestAnimationFrame(() => {
        if (!this.messageListEl) return;
        const { scrollHeight: sh, clientHeight: ch } = this.messageListEl;
        this.messageListEl.scrollTop = Math.max(sh - ch, 0);
        this.onBottomArea = true;
      });
    });
  }

  private _useResizeObserver(el: HTMLElement, callback: ResizeObserverCallback): ResizeObserver | null {
    if (window && 'ResizeObserver' in window && el) {
      const observer = new ResizeObserver(callback);
      observer.observe(el);
      return observer;
    }
    return null;
  }

  // ─── Location buttons ──────────────────────────────────────────────────────
  private async handleLocation2Bottom() {
    if (!opened.value) return;
    const channelIdentifier = opened.value!.channelIdentifier;
    const { code, list, hasMore } = await ctx().message.reqHistories(channelIdentifier, 0, true);
    if (code === NCChatUICode.SUCCESS) {
      messageList.value.length = 0;
      messageList.value = list;
      this.hasMoreForward = hasMore;
      this.hasMoreBackward = false;
      await this.updateComplete;
      this.scrollMessageListToBottom();
      this.scheduleScrollToBottomAfterPaint();
      await ctx().channelModule.clearUnreadCountByTimestamp(channelIdentifier);
      await ctx().message.sendReadReceiptMessage(channelIdentifier, list);
    }
  }

  private async handleLocation2Top() {
    if (!opened.value) return;
    this.unreadCountTop = 0;
    this.hasMoreBackward = true;
    this.updateScrollbar();
    const list = await this.handleReqHistories(this.backupFirstUnreadMessageTime, true);
    if (!list.length) return;
    await ctx().message.sendReadReceiptMessage(opened.value.channelIdentifier, list);
  }

  // ─── Message list init ─────────────────────────────────────────────────────
  private getMessageUniqueKey(message: ChatUIMessageModel): string {
    if (message.messageId) return `uid:${message.messageId}`;
    if (message.transactionId !== undefined) return `tid:${message.transactionId}`;
    if (message.clientId !== undefined) return `mid:${message.clientId}`;
    return [trans2ChannelKey(message.channelIdentifier), message.senderUserId, message.messageType, message.sentTime].join(':');
  }

  private mergeMessagesByUniqueKey(...groups: ChatUIMessageModel[][]): ChatUIMessageModel[] {
    const merged: ChatUIMessageModel[] = [];
    groups.forEach((group) => merged.push(...group));
    const keys = new Set<string>();
    const result: ChatUIMessageModel[] = [];
    for (let i = merged.length - 1; i >= 0; i -= 1) {
      const item = merged[i];
      const key = this.getMessageUniqueKey(item);
      if (keys.has(key)) continue;
      keys.add(key);
      result.unshift(item);
    }
    return result;
  }

  private async handleReqHistories(timestamp: number, backward: boolean): Promise<ChatUIMessageModel[]> {
    const context = ctx();
    const channelIdentifier = opened.value!.channelIdentifier;
    if (backward) {
      const { code: code1, list, hasMore: hasMore1 } = await context.message.reqHistories(channelIdentifier, timestamp - 1, false);
      if (code1 === NCChatUICode.SUCCESS) {
        this.hasMoreBackward = hasMore1;
        messageList.value = this.mergeMessagesByUniqueKey(list);
        await this.updateComplete;
        this.updateScrollbar();
      }
    }
    const listEl = this.messageListEl;
    const scrollTopBefore2 = listEl ? listEl.scrollTop : 0;
    const scrollHeightBefore2 = listEl ? listEl.scrollHeight : 0;
    const { code, list, hasMore } = await context.message.reqHistories(channelIdentifier, timestamp, true);
    if (code === NCChatUICode.SUCCESS) {
      messageList.value = this.mergeMessagesByUniqueKey(list, messageList.value);
      this.hasMoreForward = hasMore;
      await this.updateComplete;
      this.updateScrollbar();
      if (backward && this.messageListEl) {
        const hNew = this.messageListEl.scrollHeight;
        this.messageListEl.scrollTop = Math.max(0, scrollTopBefore2 + (hNew - scrollHeightBefore2));
      } else {
        this.scrollMessageListToBottom();
        this.scheduleScrollToBottomAfterPaint();
      }
    }
    return messageList.value;
  }

  private async initMessageList() {
    if (!opened.value) return;
    const context = ctx();
    const { channelIdentifier, unreadCount } = opened.value;
    messageList.value = [];
    this.firstUnreadMessageTime = 0;
    this.timer = null;
    unreadCountBottom.value = unreadCount;

    const backward = !this.FOCUS_ON_LATEST_MESSAGE && this.firstUnreadMessageTime > 0;
    const list = await this.handleReqHistories(this.firstUnreadMessageTime, backward);

    const length = list.length;
    if (!length) return;

    if (unreadCountBottom.value) {
      await context.channelModule.clearUnreadCountByTimestamp(channelIdentifier);
      await context.message.sendReadReceiptMessage(channelIdentifier, list);
    } else {
      await context.message.sendReadReceiptMessage(channelIdentifier, list);
    }
  }

  // ─── Multi-choice ──────────────────────────────────────────────────────────
  private stopEventWhenMultiChoiceMode(evt: Event) {
    if (multiChoiceMode.value) evt.stopImmediatePropagation();
  }

  private handleSelectMessages() {
    if (!this.messageViewportEl || !this.messageListEl || !this.selectEl) return;
    const containerTop = this.messageViewportEl.getBoundingClientRect().top;
    const selectedY = this.selectEl.getBoundingClientRect().top - containerTop;
    const msgListEls = this.messageListEl.querySelectorAll('.nc-chatui-msg-list-box');
    for (let i = msgListEls.length - 1; i >= 1; i--) {
      const topY = msgListEls[i].getBoundingClientRect().top - containerTop;
      if (topY > selectedY) {
        const inputNode = msgListEls[i].querySelectorAll('.checkbox input');
        if (inputNode.length <= 0) continue;
        this.setCheckboxStatus(inputNode);
      } else break;
    }
    selected.value = !selected.value;
  }

  private setCheckboxStatus(inputNode: NodeListOf<Element>) {
    const input = inputNode[0] as HTMLInputElement;
    if (selected.value) {
      input.checked = true;
      const index = selectedMessageUids.value.findIndex(item => input.value === item);
      if (index === -1) {
        selectedMessageUids.value = [input.value, ...selectedMessageUids.value];
      }
    } else {
      input.checked = false;
      selectedMessageUids.value = selectedMessageUids.value.filter(item => item !== input.value);
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────
  private async onDeleteMessages({ data }: MessagesDeletedEvent) {
    let newList = [...messageList.value];
    let newUids = [...selectedMessageUids.value];
    let changed = false;
    data.forEach(({ channelIdentifier, transactionId, messageId }) => {
      const index = newList.findIndex(item =>
        (item.transactionId && transactionId && item.transactionId === transactionId)
        || (item.messageId && messageId && item.messageId === messageId)
      );
      if (index === -1)
        return;
      const [model] = newList.splice(index, 1);
      if (model.messageId) {
        newUids = newUids.filter(uid => uid !== model.messageId);
      }
      changed = true;
    });
    if (changed) {
      messageList.value = newList;
      selectedMessageUids.value = newUids;
      await this.updateComplete;
      this.updateScrollbar();
    }
  }

  private onMessageStateChange(e: MessageStateChangeEvent) {
    let newList = [...messageList.value];
    e.data.forEach((message) => {
      if (opened.value!.channelIdentifier.isEqualTo(message.channelIdentifier)) {
        const index = findLastIndex(newList, (item) => {
          if (item.messageId) return item.messageId === message.messageId;
          return item.transactionId === message.transactionId;
        });
        if (index === -1) return;
        const oldTime = newList[index].sentTime;
        const updatedMessage = message.clone();
        if (message.sentTime !== oldTime) {
          newList.splice(index, 1);
          const insertIndex = findLastIndex(newList, (item) => item.sentTime <= message.sentTime);
          newList.splice(insertIndex + 1, 0, updatedMessage);
        } else {
          newList.splice(index, 1, updatedMessage);
        }
      }
    });
    messageList.value = newList;
  }

  private async onRecvNewMessages(e: RecvNewMessagesEvent) {
    if (!opened.value) return;
    const channelIdentifier = opened.value!.channelIdentifier;
    const msgList: ChatUIMessageModel[] = [];
    e.data.forEach((item) => {
      const index = messageList.value.findIndex((msg) => msg.messageId === item.messageId);
      if (channelIdentifier.isEqualTo(item.channelIdentifier) && index < 0) {
        msgList.push(item);
      }
    });
    if (!msgList.length) return;
    if (!this.onBottomArea || this.hasMoreBackward) {
      this.hasMoreBackward = true;
      return;
    }
    messageList.value = this.mergeMessagesByUniqueKey(messageList.value, msgList);
    this.setScroll2bottom();
    setTimeout(async () => {
      const { code } = await ctx().channelModule.clearUnreadCountByTimestamp(channelIdentifier);
      if (code === NCChatUICode.SUCCESS) {
        await ctx().message.sendReadReceiptMessage(channelIdentifier, msgList);
      }
    }, 100);
  }

  private async onInsertNewMessages(e: InsertNewMessagesEvent) {
    if (this.hasMoreBackward) {
      const { code, list, hasMore } = await ctx().message.reqHistories(opened.value!.channelIdentifier, 0, true);
      if (code === NCChatUICode.SUCCESS) {
        messageList.value.length = 0;
        messageList.value = this.mergeMessagesByUniqueKey(list);
        this.hasMoreForward = hasMore;
        this.hasMoreBackward = false;
        this.setScroll2bottom();
      }
      return;
    }
    e.data.forEach(async (item) => {
      if (opened.value!.channelIdentifier.isEqualTo(item.channelIdentifier)) {
        messageList.value = this.mergeMessagesByUniqueKey(messageList.value, [item]);
        if (messageList.value.length > 300) {
          messageList.value = messageList.value.slice(-300);
        }
        this.setScroll2bottom();
      }
    });
  }

  private onSelectedChanged(_e: ChannelSelectedEvent) {
    this.hasMoreForward = true;
    this.hasMoreBackward = false;
    multiChoiceMode.value = false;
    this.unreadCountTop = 0;
    this.initMessageList();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  render() {
    if (!opened.value) return nothing;
    const renderList = this.messageRenderList;
    return html`
      <div class="nc-chatui-msg-list">
        <div class="nc-chatui-msg-list-scroll" @scroll=${() => this.handleScroll()}>
          <div style="padding: 10px;">
            ${renderList.map((item, index) => {
              const key = typeof item === 'string' ? item : (item.messageId || item.transactionId || `nc-chatui-${index}`);
              return html`
                <div class="nc-chatui-msg-list-box" data-key=${key}>
                  ${typeof item !== 'string' && item.sentStatus !== 10 && multiChoiceMode.value && !isGreyMessage(item.messageType) ? html`
                    <div class="checkbox">
                      <label for=${item.messageId || `${item.transactionId}`}>
                        <input
                          .id=${item.messageId || `${item.transactionId}`}
                          type="checkbox"
                          .checked=${selectedMessageUids.value.includes(item.messageId || `${item.transactionId}`)}
                          .value=${item.messageId || `${item.transactionId}`}
                          @change=${(e: Event) => {
                            const input = e.target as HTMLInputElement;
                            if (input.checked) {
                              if (!selectedMessageUids.value.includes(input.value)) {
                                selectedMessageUids.value = [input.value, ...selectedMessageUids.value];
                              }
                            } else {
                              selectedMessageUids.value = selectedMessageUids.value.filter(uid => uid !== input.value);
                            }
                          }}
                        >
                        <span class="custom">
                          <img src=${CHECKED_ICON} alt="CHECKED_ICON">
                        </span>
                      </label>
                    </div>
                  ` : nothing}

                  ${typeof item === 'string' ? html`
                    <nc-message-time class="nc-chatui-time-section" .time=${item}></nc-message-time>
                  ` : isGreyMessage(item.messageType) ? html`
                    <nc-grey-message-provider
                      class="nc-chatui-grey-message"
                      @click=${(e: Event) => this.stopEventWhenMultiChoiceMode(e)}
                      .message=${item}
                    ></nc-grey-message-provider>
                  ` : html`
                    <div
                      class="nc-chatui-msg-list-item"
                      data-message-uid=${item.messageId || ''}
                      style="flex-direction: ${this.bubbleDirection(item)}"
                      @click=${(e: Event) => this.stopEventWhenMultiChoiceMode(e)}
                      @mouseenter=${() => { this.hoveredMessageId = item.messageId || ''; }}
                      @mouseleave=${() => { this.hoveredMessageId = ''; }}
                    >
                      ${this.bubbleShowPortrait(item) ? html`
                        <nc-icon
                          class="nc-chatui-msg-avatar"
                          .url=${this.handleUserProfiles(item).avatarUrl}
                          .width=${32} .height=${32}
                          style="opacity: ${this.showAvatar(item, renderList[index - 1]) ? 1 : 0}"
                          .radius=${50}
                          @click=${() => this.handleIconClick(item)}
                          .online=${false}
                        ></nc-icon>
                      ` : nothing}

                      <div class="nc-chatui-msg-bubble-wrapper ${this.bubbleStyleAlign(item) ? 'nc-chatui-msg-bubble-wrapper-right' : ''}">
                        <div class="nc-chatui-msg-bubble-status-row">
                          ${handleShowSentStatus(item) ? html`
                            <nc-message-sent-status
                              class="nc-chatui-msg-sent-status"
                              .type=${0}
                              .message=${item}
                              @sent-status-click=${(e: CustomEvent) => this.handleResendMessage(item, e.detail?.[0])}
                            ></nc-message-sent-status>
                          ` : nothing}
                          <nc-message-bubble
                            class="nc-chatui-msg-bubble"
                            .showname=${this.bubbleShowName(item)}
                            .align=${this.bubbleStyleAlign(item)}
                            .message=${item}
                            .profile=${this.handleUserProfiles(item)}
                            .isH5=${this.isH5}
                            .bubbleColorStyle=${this.bubbleColorStyle(item, this.showAvatar(item, renderList[index - 1]))}
                            .menuActive=${this.messageMenuDisplay === 'block' && this.currentSelectMessage?.messageId === item.messageId}
                            .isItemHover=${this.hoveredMessageId === item.messageId}
                            @sent-status-click=${() => this.handleResendMessage(item)}
                            @click=${() => this.handleBubbleClick(item)}
                            @menu-click=${(e: CustomEvent) => this.handleMessageRightClick(item, e)}
                            @contextmenu=${(e: MouseEvent) => { e.preventDefault(); this.handleMessageRightClick(item, e); }}
                          >
                            ${(() => {
                              const tag = getMessageComponentTag(item.messageType);
                              if (!tag) return nothing;
                              const tagName = unsafeStatic(tag);
                              return staticHtml`<${tagName} .message=${item} @link=${(e: CustomEvent) => this.handleLinkClick(e)}></${tagName}>`;
                            })()}
                          </nc-message-bubble>
                        </div>

                        ${item.messageType === MessageType.HD_VOICE && item.messageId && this.shouldShowSTTStatus(item.messageId) ? html`
                          <div class="nc-chatui-stt-status ${this.bubbleStyleAlign(item) ? 'nc-chatui-stt-status-right' : ''}">
                            ${this.getSTTStatus(item.messageId) === 'converting' ? html`
                              <div class="nc-chatui-stt-converting">
                                <div class="nc-chatui-stt-loading">
                                  <div class="nc-chatui-stt-loading-dot"></div>
                                  <div class="nc-chatui-stt-loading-dot"></div>
                                  <div class="nc-chatui-stt-loading-dot"></div>
                                </div>
                              </div>
                            ` : this.getSTTStatus(item.messageId) === 'error' ? html`
                              <div class="nc-chatui-stt-error">
                                <nc-icon .url=${SENT_STATUS_FAILED_ICON} .radius=${50} .width=${16} .height=${16} class="nc-chatui-stt-error-icon"></nc-icon>
                                <span class="nc-chatui-stt-error-text">
                                  ${this.sttErrorCodeMap[item.messageId] === NCChatUICode.SPEECH_TO_TEXT_MESSAGE_CONTENT_UNSUPPORTED
                                    ? this.$tt('message.speech.to.text.unsupported')
                                    : this.$tt('message.speech.to.text.failed')}
                                </span>
                              </div>
                            ` : html`
                              <div class="nc-chatui-stt-success">${this.getSTTText(item.messageId)}</div>
                            `}
                          </div>
                        ` : nothing}
                      </div>
                    </div>
                  `}
                </div>
              `;
            })}
          </div>
        </div>

        ${this.sizeHeight ? html`
          <nc-scrollbar-thumb-provider
            @handlemove=${(e: CustomEvent) => this.handleMove(e)}
            @mouseenter=${() => this.handleScrollbarEnter()}
            @mouseleave=${() => this.handleScrollbarLeave()}
            .height=${this.sizeHeight}
            .move=${this.moveY}
            .scrollheight=${this.messageListEl?.scrollHeight}
            .ratio=${this.ratioY}
            style="opacity: ${this.showScrollbar ? 1 : 0}; transition: opacity 0.5s; pointer-events: ${this.showScrollbar ? 'auto' : 'none'}"
          ></nc-scrollbar-thumb-provider>
        ` : nothing}

        ${this.isH5 && this.messageMenuDisplay === 'block' ? html`
          <div class="nc-message-list-menu-mask" @click=${() => this.hideMsgMenu()}></div>
        ` : nothing}

        <div class="nc-message-list-menu" style="top: ${this.messageMenuTop}px; left: ${this.messageMenuLeft}px; display: ${this.messageMenuDisplay}">
          ${this.msgMenu.length > 0 ? html`
            <div style="padding: 5px;">
              ${this.msgMenu.map(item => html`
                <nc-message-list-menu-item
                  .icon=${item.icon}
                  .id=${item.id}
                  .label=${item.label}
                  @click=${() => this.handleMenuItemClick(item.id, item.message)}
                ></nc-message-list-menu-item>
              `)}
            </div>
          ` : nothing}
        </div>

        ${multiChoiceMode.value ? html`
          <nc-message-select
            class="nc-chatui-select"
            .selected=${!!selected.value}
            @select=${() => this.handleSelectMessages()}
          ></nc-message-select>
        ` : nothing}

        ${unreadCountBottom.value > 0 && this.hasMoreBackward ? html`
          <nc-message-location
            @click=${(e: Event) => this.stopEventWhenMultiChoiceMode(e)}
            .count=${unreadCountBottom.value}
            .direction=${1}
            @location=${() => this.handleLocation2Bottom()}
          ></nc-message-location>
        ` : nothing}

        ${this.unreadCountTop > 0 && this.FOCUS_ON_LATEST_MESSAGE ? html`
          <nc-message-location
            @click=${(e: Event) => this.stopEventWhenMultiChoiceMode(e)}
            .count=${this.unreadCountTop}
            .direction=${0}
            @location=${() => this.handleLocation2Top()}
          ></nc-message-location>
        ` : nothing}

        ${this.showReadReceiptModal ? html`
          <nc-read-receipt-modal
            .message=${this.readReceiptMessage}
            .visible=${this.showReadReceiptModal}
            .readUsers=${this.readUsers}
            .unreadUsers=${this.unreadUsers}
            .readLoading=${this.readLoading}
            .unreadLoading=${this.unreadLoading}
            .position=${{ top: this.readReceiptPositionTop, left: this.readReceiptPositionLeft, anchor: this.readReceiptAnchor }}
            @close=${() => this.handleCloseReadReceiptModal()}
            @read-status-scroll=${(e: CustomEvent) => this.onReadReceiptScroll(e)}
          ></nc-read-receipt-modal>
        ` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host { display: block; height: 100%; }
    p { margin: 0; }
    ul, li { padding: 0; margin: 0; list-style: none; }
    .nc-chatui-msg-list { position: relative; overflow: hidden; height: 100%; box-sizing: border-box; }
    .nc-chatui-msg-list-scroll { overflow-y: scroll; overflow-x: hidden; height: 100%; scrollbar-width: none; box-sizing: border-box; }
    .nc-chatui-msg-list-scroll::-webkit-scrollbar { display: none; }
    .nc-chatui-msg-list-item { display: flex; width: 100%; }
    .nc-chatui-grey-message { flex: 1; text-align: center; }
    .nc-chatui-msg-avatar { padding: 0 8px; }
    .nc-chatui-msg-bubble-wrapper { display: flex; flex-direction: column; max-width: 70%; align-items: flex-start; }
    .nc-chatui-msg-bubble-wrapper-right { align-items: flex-end; }
    .nc-chatui-msg-bubble-status-row { display: flex; flex-direction: row; align-items: inherit; gap: 4px; position: relative; min-width: 0; max-width: 100%; }
    .nc-chatui-msg-bubble { padding-bottom: 10px; border-radius: 8px 0 8px; font-size: 12px; line-height: 16px; overflow: hidden; min-width: 0; max-width: 100%; }
    @media (max-width: 768px) { .nc-chatui-msg-bubble { user-select: none; -webkit-user-select: none; } }
    @media (min-width: 768px) { .nc-chatui-msg-sent-status { position: absolute; bottom: 0; left: 8px; } }
    .nc-chatui-msg-sent-status { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding-bottom: 10px; }
    .nc-chatui-stt-status { padding: 9px; font-size: 14px; line-height: 18px; word-break: break-word; display: flex; flex-direction: column; box-sizing: border-box; border-radius: 8px; background: #E3E7EF; }
    .nc-chatui-stt-status-right { align-items: flex-end; border-radius: 8px; }
    .nc-chatui-stt-converting { display: flex; align-items: center; }
    .nc-chatui-stt-loading { display: block; font-size: 0; color: #000; width: 54px; }
    .nc-chatui-stt-loading .nc-chatui-stt-loading-dot { display: inline-block; float: none; background-color: currentColor; border: 0 solid currentColor; width: 6px; height: 6px; margin: 4px; border-radius: 100%; animation: ball-pulse 1s ease infinite; }
    .nc-chatui-stt-loading .nc-chatui-stt-loading-dot:nth-child(1) { animation-delay: -200ms; }
    .nc-chatui-stt-loading .nc-chatui-stt-loading-dot:nth-child(2) { animation-delay: -100ms; }
    .nc-chatui-stt-loading .nc-chatui-stt-loading-dot:nth-child(3) { animation-delay: 0ms; }
    @keyframes ball-pulse { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
    .nc-chatui-stt-error { display: flex; align-items: center; gap: 4px; }
    .nc-chatui-stt-error-text { color: #1D2129; }
    .nc-chatui-stt-success { color: #333333; min-height: 18px; line-height: 18px; white-space: pre-wrap; display: block; }
    .nc-message-list-menu { position: absolute; top: 0; left: 0; z-index: 3; background-color: #fff; border-radius: 9px; box-shadow: 0px 5px 16px 0px #00000014; min-width: 95px; }
    .nc-message-list-menu-mask { position: absolute; top: 0; left: 0; z-index: 2; width: 100%; height: 100%; }
    .nc-chatui-msg-list-box { display: flex; align-items: center; }
    .nc-chatui-time-section { width: 100%; }
    .nc-chatui-msg-list-box .checkbox { margin-right: 7px; align-self: flex-start; }
    .nc-chatui-msg-list-box .checkbox input[type="checkbox"] { display: none; }
    .nc-chatui-msg-list-box .checkbox .custom { display: flex; width: 16px; height: 16px; border: 1px solid #ABB8CB; border-radius: 50%; background-color: #FFFFFF; font-size: 0; justify-content: center; align-items: center; cursor: pointer; }
    .nc-chatui-msg-list-box .checkbox input[type="checkbox"]:checked + .custom { background-color: #16D258; border-color: #16D258; }
    .nc-chatui-select { position: absolute; top: 150px; left: 0px; width: 100%; box-sizing: border-box; z-index: 1; }
  `;
}
