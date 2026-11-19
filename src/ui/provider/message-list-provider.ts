import { LitElement, html, css, nothing } from 'lit';
import { state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { BaseChannel, ChannelIdentifier, ChannelType, MessageDirection, MessageReadReceiptStatus, MessagesReadReceiptUsersQuery, TextMessageContent } from '@nexconn/chat';
import {
  ctx, multiChoiceMode, replyMessage, selectedMessageUids,
  openedChannel as opened, selectedGroupMembers, currentUserProfile,
  getMessageComponentTag, getMessageBubbleContentLayout, isGreyMessage, selected, messageList, forwarding,
  handleShowSentStatus, unreadCountBottom,
  getMessageDesc,
  sttStatusMap, sttTextMap, sttHiddenMap, sttErrorCodeMap,
} from './context';
import { I18nController } from '../i18n';
import { SignalController } from '../SignalController';
import { createLongPressHandlers } from '../long-press';
import { LanguagePackEntries } from '../../languages';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { ChatUIMessageEditStatus, ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { MessageBubbleConfig, BubbleLayout } from '../../modules/BubbleModule';
import {
  formatTime, findLastIndex, createScrollControl, isMobileDevice,
  trans2ChannelKey,
} from '../../helper';
import { canReactToMessage, MessageMenuID } from '../../modules/MessageMenu';
import { CHECKED_ICON, SENT_STATUS_FAILED_ICON, MESSAGE_EDIT_UPDATING_ICON, MESSAGE_EDIT_FAILED_ICON } from '../../assets';
import {
  ChannelSelectedEvent, MessagesDeletedEvent,
  InnerEvent, InsertNewMessagesEvent, MessageLinckClick, MessageStateChangeEvent, ChatUIEvents,
  ModalForwardingType, RecvNewMessagesEvent,
} from '@lib/core/EventDefined';
import {
  MessageType, SentStatus, MessageReadReceiptUser,
} from '@nexconn/chat';
import { NCChatUICode } from '@lib/enums/NCChatUICode';
import { createVirtualListHeightCache } from '../virtual-list-height-cache';
import {
  calculateViewportAnchorScrollTop,
  createVirtualResizeAnchorController,
  VirtualResizeAnchorTransaction,
} from '../virtual-list-scroll-anchor';
import {
  calculateReadReceiptFallbackLayout,
  calculateReadReceiptLayout,
} from '../read-receipt-layout';

type IUIMessage = string | ChatUIMessageModel;

interface VirtualRenderItem {
  item: IUIMessage;
  index: number;
  key: string;
}

interface VirtualScrollAnchor {
  key: string;
  offset: number;
  viewportOffset?: number;
}

interface VirtualResizeAnchor extends VirtualScrollAnchor {
  viewportOffset: number;
  preserveViewport?: boolean;
  scrollTop: number;
}

interface MessageListMetrics {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
  offsetHeight: number;
}

interface MessageEditEmojiPanelToggleDetail {
  evt: MouseEvent;
  onSelect: (emoji: string) => void;
}

export class MessageListProvider extends LitElement {
  private i18n = new I18nController(this);
  private longPress = createLongPressHandlers();
  private _signalController = new SignalController(this, [
    messageList, multiChoiceMode, selectedMessageUids, opened, unreadCountBottom,
    currentUserProfile, selectedGroupMembers,
    sttStatusMap, sttTextMap, sttHiddenMap, sttErrorCodeMap,
  ]);

  @query('.nc-chatui-msg-list') private declare messageViewportEl: HTMLElement | undefined;
  @query('.nc-chatui-msg-list-scroll') private declare messageListEl: HTMLElement | undefined;
  @query('.nc-message-list-menu') private declare messageMenuEl: HTMLElement | undefined;
  @query('.nc-reaction-panel') private declare reactionPanelEl: HTMLElement | undefined;
  @query('.nc-chatui-select') private declare selectEl: HTMLElement | undefined;
  @query('.nc-chatui-msg-list-box-container') private declare messageBoxEl: HTMLElement | undefined;

  @state() private declare hoveredMessageId: string;
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
  @state() private declare readTotalCount: number;
  @state() private declare unreadTotalCount: number;
  @state() private declare readHasMore: boolean;
  @state() private declare unreadHasMore: boolean;
  @state() private declare readLoading: boolean;
  @state() private declare unreadLoading: boolean;
  @state() private declare readReceiptPositionTop: number;
  @state() private declare readReceiptPositionLeft: number;
  @state() private declare readReceiptAnchor: string;
  @state() private declare readReceiptMaxHeight: number;
  @state() private declare messageBubbleCfg: MessageBubbleConfig | undefined;
  @state() private declare hasMoreBackward: boolean;
  @state() private declare multiChoice: boolean;
  @state() private declare selectedUids: string[];
  @state() private declare showReadReceiptModalMessageUId: string;
  @state() private declare reactionPanelDisplay: 'grid' | 'none';
  @state() private declare reactionPanelTop: number;
  @state() private declare reactionPanelLeft: number;
  @state() private declare reactionTargetMessage: ChatUIMessageModel | undefined;
  @state() private declare reactionPanelMode: 'reaction' | 'edit';
  @state() private declare virtualStart: number;
  @state() private declare virtualEnd: number;
  @state() private declare topSpacerHeight: number;
  @state() private declare bottomSpacerHeight: number;

  private readQuery: MessagesReadReceiptUsersQuery | null = null;
  private unreadQuery: MessagesReadReceiptUsersQuery | null = null;

  private scrollControl: ReturnType<typeof createScrollControl> | null = null;
  private scrollbarHideTimer: any = null;
  private resizeRefObserver: ResizeObserver | null = null;
  private messageRowResizeObserver: ResizeObserver | null = null;
  private observedMessageRows = new Set<HTMLElement>();
  private observedMessageListEl: HTMLElement | undefined;
  private reactionPanelEditSelect: ((emoji: string) => void) | undefined;
  private hasMoreForward = true;
  private firstUnreadMessageTime = 0;
  private backupFirstUnreadMessageTime = 0;
  private paginationTask: symbol | null = null;
  private paginationAfterScroll = false;
  private readReceiptStatusElement: HTMLElement | null = null;
  private messageRenderSource: ChatUIMessageModel[] | null = null;
  private messageRenderHasMoreForward = true;
  private messageRenderCache: IUIMessage[] = [];
  private messageListGeneration = 0;
  private readonly rowHeightCache = createVirtualListHeightCache();
  private readonly resizeAnchorController = createVirtualResizeAnchorController<VirtualResizeAnchor>();
  private virtualWindowFrame = 0;
  private virtualMeasureFrame = 0;
  private resizeLayoutTimer: ReturnType<typeof setTimeout> | undefined;
  private adjustScrollFrame = 0;
  private adjustScrollWriteFrame = 0;
  private bottomResyncFrame = 0;
  private layoutRefreshRequested = false;
  private layoutMeasurementRequested = false;
  private layoutBottomPreservationRequested = false;
  private lastTouchY: number | undefined;
  private hasUserScrolledAwayFromBottom = false;
  private wasStrictlyAtBottomBeforeResize = true;

  private readonly VIRTUAL_ITEM_ESTIMATED_HEIGHT = 88;
  private readonly VIRTUAL_TIME_ESTIMATED_HEIGHT = 32;
  private readonly VIRTUAL_OVERSCAN_PX = 704;
  private readonly STRICT_BOTTOM_THRESHOLD_PX = 2;
  private readonly BOTTOM_AREA_THRESHOLD_PX = 100;

  private readonly weeklist: Array<keyof LanguagePackEntries> = [
    'time.format.sunday', 'time.format.monday', 'time.format.tueday',
    'time.format.wedday', 'time.format.thurday', 'time.format.friday', 'time.format.satday',
  ];

  private _onSelectedChanged = (e: ChannelSelectedEvent) => this.onSelectedChanged(e);
  private _onRecvNewMessages = (e: RecvNewMessagesEvent) => this.onRecvNewMessages(e);
  private _onInsertNewMessages = (e: InsertNewMessagesEvent) => this.onInsertNewMessages(e);
  private _onDeleteMessages = (e: MessagesDeletedEvent) => this.onDeleteMessages(e);
  private _onMessageStateChange = (e: MessageStateChangeEvent) => this.onMessageStateChange(e);
  private _onAdjustMessageListScroll = () => this.handleAdjustMessageListScroll();
  private _hideMsgMenu = () => this.hideMsgMenu();
  private _hideReactionPanel = () => this.hideReactionPanel();
  private _handleClickOutside = (e: MouseEvent) => this.handleClickOutside(e);
  private _checkDevice = () => this.checkDevice();
  private _handleWindowResize = () => this.handleWindowResize();
  private _unsubscribeMultiChoiceMode: (() => void) | undefined;
  private readonly _handleUserScrollInput = Object.assign(
    (event: Event) => this.handleUserScrollInput(event),
    { capture: true, passive: true },
  );
  private readonly _blockMultiChoiceMouseEvent = Object.assign(
    (event: Event) => this.stopEventWhenMultiChoiceMode(event),
    { capture: true },
  );
  private readonly _blockMultiChoiceTouchEvent = Object.assign(
    (event: Event) => this.stopEventWhenMultiChoiceMode(event),
    { capture: true, passive: true },
  );
  private _updateScrollbar = () => this.scheduleResizeLayoutUpdate();

  private get FOCUS_ON_LATEST_MESSAGE(): boolean {
    // return ctx().store.getCommandSwitch(ChatUICommand.FOCUS_ON_LATEST_MESSAGE);
    return true;
  }

  private get messageRenderList(): IUIMessage[] {
    const list = messageList.value;
    if (
      list === this.messageRenderSource
      && this.messageRenderHasMoreForward === this.hasMoreForward
    ) {
      return this.messageRenderCache;
    }
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
    this.messageRenderSource = list;
    this.messageRenderHasMoreForward = this.hasMoreForward;
    this.messageRenderCache = result;
    this.rowHeightCache.prune(new Set(result.map((item, index) => this.getVirtualItemKey(index, item))));
    return result;
  }

  private getRenderItemKey(item: IUIMessage, index: number): string {
    if (typeof item === 'string') return `time:${item}`;
    if (Number.isFinite(item.transactionId)) return `tid:${item.transactionId}`;
    if (item.messageId) return `uid:${item.messageId}`;
    if (item.clientId !== undefined) return `mid:${item.clientId}`;
    return `message:${this.getMessageUniqueKey(item)}:${index}`;
  }

  private getVirtualItemKey(index: number, item = this.messageRenderList[index]): string {
    return item ? this.getRenderItemKey(item, index) : `nc-chatui-empty-${index}`;
  }

  private getEstimatedItemHeight(item: IUIMessage | undefined): number {
    return typeof item === 'string'
      ? this.VIRTUAL_TIME_ESTIMATED_HEIGHT
      : this.VIRTUAL_ITEM_ESTIMATED_HEIGHT;
  }

  private getVirtualItemHeight(index: number): number {
    const item = this.messageRenderList[index];
    if (!item) return 0;
    return this.rowHeightCache.get(this.getVirtualItemKey(index, item))
      || this.getEstimatedItemHeight(item);
  }

  private getHeightBeforeIndex(targetIndex: number): number {
    const end = Math.max(0, Math.min(targetIndex, this.messageRenderList.length));
    let height = 0;
    for (let index = 0; index < end; index += 1) {
      height += this.getVirtualItemHeight(index);
    }
    return height;
  }

  private getVirtualTotalHeight(): number {
    return this.getHeightBeforeIndex(this.messageRenderList.length);
  }

  private findVirtualIndexByOffset(offset: number): number {
    const list = this.messageRenderList;
    if (!list.length) return 0;
    let height = 0;
    for (let index = 0; index < list.length; index += 1) {
      const nextHeight = height + this.getVirtualItemHeight(index);
      if (nextHeight >= offset) return index;
      height = nextHeight;
    }
    return list.length - 1;
  }

  private readMessageListMetrics(): MessageListMetrics | null {
    if (!this.messageListEl) return null;
    const { scrollHeight, scrollTop, clientHeight, offsetHeight } = this.messageListEl;
    return { scrollHeight, scrollTop, clientHeight, offsetHeight };
  }

  private getDistanceFromBottom(metrics: MessageListMetrics): number {
    return metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop;
  }

  private isStrictlyAtBottom(metrics: MessageListMetrics): boolean {
    return this.getDistanceFromBottom(metrics) <= this.STRICT_BOTTOM_THRESHOLD_PX;
  }

  private isInBottomArea(metrics: MessageListMetrics): boolean {
    return this.getDistanceFromBottom(metrics) <= this.BOTTOM_AREA_THRESHOLD_PX;
  }

  private syncBottomState(metrics = this.readMessageListMetrics()) {
    if (!metrics) return;
    const isStrictlyAtBottom = this.isStrictlyAtBottom(metrics);
    this.onBottomArea = this.isInBottomArea(metrics);
    this.hasUserScrolledAwayFromBottom = !isStrictlyAtBottom;
    this.wasStrictlyAtBottomBeforeResize = isStrictlyAtBottom;
    if (!isStrictlyAtBottom) this.cancelAdjustMessageListScroll();
  }

  private setVirtualRange(start: number, end: number, top: number, bottom: number) {
    this.virtualStart = start;
    this.virtualEnd = end;
    this.topSpacerHeight = top;
    this.bottomSpacerHeight = bottom;
  }

  private setVirtualRangeByIndex(start: number, end: number) {
    const top = this.getHeightBeforeIndex(start);
    const bottom = this.getVirtualTotalHeight() - this.getHeightBeforeIndex(end + 1);
    this.setVirtualRange(start, end, top, Math.max(bottom, 0));
    this.closeFloatingLayerWhenTargetInvisible();
  }

  private renderVirtualWindowAtOffset(scrollTop: number, clientHeight: number) {
    const overscan = Math.max(clientHeight, this.VIRTUAL_OVERSCAN_PX);
    const start = this.findVirtualIndexByOffset(Math.max(scrollTop - overscan, 0));
    const end = this.findVirtualIndexByOffset(scrollTop + clientHeight + overscan);
    this.setVirtualRangeByIndex(start, end);
  }

  private recalculateVirtualWindow() {
    const list = this.messageRenderList;
    const metrics = this.readMessageListMetrics();
    if (!list.length) {
      this.setVirtualRange(0, -1, 0, 0);
      return;
    }
    const clientHeight = metrics?.clientHeight || this.VIRTUAL_ITEM_ESTIMATED_HEIGHT;
    // Clamp elastic offsets against virtual content, since DOM spacers may
    // still describe the previous window while Lit commits a replacement.
    const scrollTop = Math.max(0, Math.min(
      metrics?.scrollTop || 0,
      Math.max(this.getVirtualTotalHeight() - clientHeight, 0),
    ));
    this.renderVirtualWindowAtOffset(scrollTop, clientHeight);
  }

  private renderVirtualWindowAroundIndex(anchorIndex: number) {
    const list = this.messageRenderList;
    const metrics = this.readMessageListMetrics();
    if (!list.length) {
      this.recalculateVirtualWindow();
      return;
    }
    this.renderVirtualWindowAtOffset(
      this.getHeightBeforeIndex(anchorIndex),
      metrics?.clientHeight || this.VIRTUAL_ITEM_ESTIMATED_HEIGHT,
    );
  }

  private get virtualRenderList(): VirtualRenderItem[] {
    const list = this.messageRenderList;
    if (!list.length || this.virtualEnd < this.virtualStart) return [];
    const end = Math.min(this.virtualEnd, list.length - 1);
    const result: VirtualRenderItem[] = [];
    for (let index = this.virtualStart; index <= end; index += 1) {
      const item = list[index];
      result.push({ item, index, key: this.getVirtualItemKey(index, item) });
    }
    return result;
  }

  private scheduleVirtualWindowUpdate() {
    if (!this.isConnected || this.virtualWindowFrame) return;
    this.virtualWindowFrame = requestAnimationFrame(() => {
      this.virtualWindowFrame = 0;
      if (!this.isConnected) return;
      if (!this.resizeAnchorController.peek()) {
        // Capture the committed DOM before estimated rows replace the window.
        const anchor = this.captureRenderedScrollAnchor();
        if (anchor && this.hasUserScrolledAwayFromBottom) this.resizeAnchorController.begin(anchor);
        this.recalculateVirtualWindow();
      }
      void this.updateComplete.then(() => {
        // Measure the committed window before paint, rather than leaving an
        // estimated-height gap visible until another animation frame.
        if (this.isConnected) this.measureVirtualRows();
      });
    });
  }

  private scheduleVirtualMeasurement() {
    if (!this.isConnected || this.virtualMeasureFrame) return;
    this.virtualMeasureFrame = requestAnimationFrame(() => {
      this.virtualMeasureFrame = 0;
      if (!this.isConnected || this.resizeLayoutTimer) return;
      this.measureVirtualRows();
    });
  }

  private async refreshVirtualWindow(anchor?: VirtualScrollAnchor | null) {
    await this.updateComplete;
    if (!this.isConnected) return;
    if (!this.invalidateVirtualHeightsForWidthChange()) {
      const anchorIndex = anchor ? this.findRenderIndexByKey(anchor.key) : -1;
      if (anchorIndex !== -1) this.renderVirtualWindowAroundIndex(anchorIndex);
      else this.recalculateVirtualWindow();
    }
    await this.updateComplete;
    if (!this.isConnected) return;
    // A history insertion must settle in the commit's microtask, before the
    // browser paints the old scroll offset against the newly inserted rows.
    if (anchor?.viewportOffset !== undefined) this.measureVirtualRows();
    else this.scheduleVirtualMeasurement();
  }

  private continueVirtualMeasurement(pass: number) {
    void this.updateComplete.then(() => {
      if (!this.isConnected) return;
      // Bound synchronous layout work when many new rows need measuring.
      if (pass < 3) this.measureVirtualRows(pass + 1);
      else this.scheduleVirtualMeasurement();
    });
  }

  private ensureVirtualWindowCoverage(): boolean {
    if (!this.messageListEl) return false;
    const rows = this.messageListEl.querySelectorAll<HTMLElement>('.nc-chatui-msg-list-box[data-virtual-index]');
    if (!rows.length) return false;
    const viewport = this.messageListEl.getBoundingClientRect();
    const first = rows[0].getBoundingClientRect();
    const last = rows[rows.length - 1].getBoundingClientRect();
    const overscan = Math.max(this.messageListEl.clientHeight, this.VIRTUAL_OVERSCAN_PX);
    let start = this.virtualStart;
    let end = this.virtualEnd;
    if (start > 0 && first.top > viewport.top + 1) {
      start = this.findVirtualIndexByOffset(Math.max(
        this.getHeightBeforeIndex(start) - (first.top - viewport.top) - overscan, 0,
      ));
    }
    if (end < this.messageRenderList.length - 1 && last.bottom < viewport.bottom - 1) {
      end = this.findVirtualIndexByOffset(
        this.getHeightBeforeIndex(end + 1) + viewport.bottom - last.bottom + overscan,
      );
    }
    if (start === this.virtualStart && end === this.virtualEnd) return false;
    this.setVirtualRangeByIndex(start, end);
    return true;
  }

  private measureVirtualRows(pass = 0) {
    if (!this.messageListEl) return;
    this.alignMessageEditStatuses();
    const metrics = this.readMessageListMetrics();
    const shouldKeepBottom = !!metrics
      && this.wasStrictlyAtBottomBeforeResize
      && !this.hasUserScrolledAwayFromBottom;
    let resizeTransaction = this.resizeAnchorController.peek();
    const visibleAnchor = !resizeTransaction && !shouldKeepBottom
      ? this.captureRenderedScrollAnchor()
      : null;
    let changed = false;
    this.messageListEl.querySelectorAll<HTMLElement>('.nc-chatui-msg-list-box[data-virtual-index]').forEach((row) => {
      const index = Number(row.dataset.virtualIndex);
      const item = this.messageRenderList[index];
      if (!item) return;
      const style = window.getComputedStyle(row);
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      const measuredHeight = row.getBoundingClientRect().height + marginBottom;
      const key = this.getVirtualItemKey(index, item);
      const cachedHeight = this.rowHeightCache.get(key);
      if (measuredHeight > 0 && Math.abs((cachedHeight || 0) - measuredHeight) > 0.5) {
        this.rowHeightCache.set(key, measuredHeight);
        changed = true;
      }
    });

    if (!resizeTransaction && changed && visibleAnchor) {
      resizeTransaction = this.resizeAnchorController.begin(visibleAnchor);
    }
    if (resizeTransaction && (
      resizeTransaction.value.preserveViewport || (changed && !shouldKeepBottom)
    )) {
      const anchorIndex = this.findRenderIndexByKey(resizeTransaction.value.key);
      if (anchorIndex !== -1) {
        const transaction = resizeTransaction;
        if (anchorIndex < this.virtualStart || anchorIndex > this.virtualEnd) {
          this.renderVirtualWindowAroundIndex(anchorIndex);
        } else {
          this.setVirtualRangeByIndex(this.virtualStart, this.virtualEnd);
        }
        void this.updateComplete.then(() => {
          if (this.isConnected) {
            this.restoreResizeScrollAnchor(transaction, changed);
            this.continueVirtualMeasurement(pass);
          } else this.resizeAnchorController.cancel();
        });
        return;
      }
    }
    if (resizeTransaction) this.resizeAnchorController.cancel();
    if (!changed) {
      if (this.ensureVirtualWindowCoverage()) this.continueVirtualMeasurement(pass);
      return;
    }
    this.recalculateVirtualWindow();
    this.continueVirtualMeasurement(pass);
    if (shouldKeepBottom) this.scheduleBottomResync();
  }

  private resetVirtualWindow() {
    this.rowHeightCache.reset();
    this.resizeAnchorController.cancel();
    this.paginationAfterScroll = false;
    this.setVirtualRange(0, -1, 0, 0);
    this.messageRenderSource = null;
    this.messageRenderCache = [];
    if (this.virtualWindowFrame) cancelAnimationFrame(this.virtualWindowFrame);
    if (this.virtualMeasureFrame) cancelAnimationFrame(this.virtualMeasureFrame);
    this.virtualWindowFrame = 0;
    this.virtualMeasureFrame = 0;
  }

  private findRenderIndexByKey(key: string): number {
    return this.messageRenderList.findIndex((item, index) => this.getVirtualItemKey(index, item) === key);
  }

  private captureScrollAnchor(): VirtualScrollAnchor | null {
    const metrics = this.readMessageListMetrics();
    if (!metrics || !this.messageRenderList.length) return null;
    const index = this.findVirtualIndexByOffset(metrics.scrollTop);
    return {
      key: this.getVirtualItemKey(index, this.messageRenderList[index]),
      offset: metrics.scrollTop - this.getHeightBeforeIndex(index),
    };
  }

  private captureRenderedScrollAnchor(): VirtualResizeAnchor | null {
    const viewport = this.messageListEl?.getBoundingClientRect();
    if (viewport && this.messageListEl) {
      const rows = this.messageListEl.querySelectorAll<HTMLElement>('.nc-chatui-msg-list-box[data-virtual-index]');
      for (const row of Array.from(rows)) {
        const bounds = row.getBoundingClientRect();
        if (bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) continue;
        const index = row.dataset.key
          ? this.findRenderIndexByKey(row.dataset.key)
          : Number(row.dataset.virtualIndex);
        if (!this.messageRenderList[index]) continue;
        const anchor = {
          key: this.getVirtualItemKey(index),
          offset: this.messageListEl.scrollTop - this.getHeightBeforeIndex(index),
          viewportOffset: bounds.top - viewport.top,
          preserveViewport: true,
          scrollTop: this.messageListEl.scrollTop,
        };
        return anchor;
      }
    }
    return null;
  }

  private capturePaginationAnchor(): VirtualScrollAnchor | null {
    this.resizeAnchorController.cancel();
    const anchor = this.captureRenderedScrollAnchor();
    if (!anchor) return this.captureScrollAnchor();
    if (this.virtualWindowFrame) cancelAnimationFrame(this.virtualWindowFrame);
    this.virtualWindowFrame = 0;
    this.resizeAnchorController.begin(anchor);
    return anchor;
  }

  private restorePaginationAnchor(anchor: VirtualScrollAnchor | null) {
    // DOM anchors are restored after measuring the inserted rows, including
    // any touch or inertial movement since the page was inserted.
    if (anchor?.viewportOffset === undefined) this.restoreScrollAnchor(anchor);
  }

  private restoreScrollAnchor(anchor: VirtualScrollAnchor | null) {
    this.resizeAnchorController.cancel();
    if (!anchor || !this.messageListEl) {
      this.scheduleVirtualWindowUpdate();
      return;
    }
    const index = this.findRenderIndexByKey(anchor.key);
    if (index === -1) {
      this.scheduleVirtualWindowUpdate();
      return;
    }
    this.messageListEl.scrollTop = Math.max(this.getHeightBeforeIndex(index) + anchor.offset, 0);
    this.recalculateVirtualWindow();
    this.scheduleVirtualMeasurement();
    this.syncScrollbarPosition();
    this.syncBottomState();
  }

  private getRenderedViewportOffset(key: string): number | null {
    if (!this.messageListEl) return null;
    const row = Array.from(this.messageListEl.querySelectorAll<HTMLElement>('.nc-chatui-msg-list-box[data-virtual-index]'))
      .find(item => item.dataset.key === key);
    if (!row) return null;
    return row.getBoundingClientRect().top - this.messageListEl.getBoundingClientRect().top;
  }

  private getScrollDeltaSinceAnchor(anchor: VirtualResizeAnchor, metrics = this.readMessageListMetrics()): number {
    if (!metrics) return 0;
    // A shorter rendered window may clamp scrollTop without user interaction.
    const expected = Math.max(0, Math.min(anchor.scrollTop, metrics.scrollHeight - metrics.clientHeight));
    return metrics.scrollTop - expected;
  }

  private restoreResizeScrollAnchor(
    transaction: VirtualResizeAnchorTransaction<VirtualResizeAnchor>,
    heightsChanged = false,
  ) {
    if (
      !this.isConnected
      || !this.messageListEl
      || !this.resizeAnchorController.isCurrent(transaction)
    ) return;
    const viewportOffset = transaction.value.viewportOffset - this.getScrollDeltaSinceAnchor(transaction.value);
    const currentViewportOffset = this.getRenderedViewportOffset(transaction.value.key);
    if (currentViewportOffset === null) {
      this.resizeAnchorController.cancel();
      this.recalculateVirtualWindow();
      this.scheduleVirtualMeasurement();
      this.resumePaginationAfterScroll();
      return;
    }
    const scrollTop = calculateViewportAnchorScrollTop(
      this.messageListEl.scrollTop,
      currentViewportOffset,
      viewportOffset,
    );
    // Avoid assigning an unchanged offset, which can interrupt native momentum.
    if (Math.abs(this.messageListEl.scrollTop - scrollTop) > 0.5) this.messageListEl.scrollTop = scrollTop;
    const range = [this.virtualStart, this.virtualEnd, this.topSpacerHeight, this.bottomSpacerHeight];
    this.recalculateVirtualWindow();
    const windowChanged = range[0] !== this.virtualStart || range[1] !== this.virtualEnd
      || range[2] !== this.topSpacerHeight || range[3] !== this.bottomSpacerHeight;
    const anchorIndex = this.findRenderIndexByKey(transaction.value.key);
    if (transaction.value.preserveViewport && (heightsChanged || windowChanged)
      && anchorIndex >= this.virtualStart && anchorIndex <= this.virtualEnd) {
      // Keep the same DOM anchor until all newly exposed rows have settled.
      this.resizeAnchorController.begin({ ...transaction.value, viewportOffset, scrollTop: this.messageListEl.scrollTop });
    } else {
      this.resizeAnchorController.cancel();
    }
    this.scheduleVirtualMeasurement();
    this.syncScrollbarPosition();
    this.syncBottomState();
    this.resumePaginationAfterScroll();
  }

  private resumePaginationAfterScroll() {
    if (!this.paginationAfterScroll || this.resizeAnchorController.peek()) return;
    this.paginationAfterScroll = false;
    const metrics = this.readMessageListMetrics();
    if (!metrics) return;
    if (metrics.scrollTop <= 200 && this.hasMoreForward) void this.schedulePagination(true);
    else if (this.hasMoreBackward && this.getDistanceFromBottom(metrics) <= 200) void this.schedulePagination(false);
  }

  private invalidateVirtualHeightsForWidthChange(): boolean {
    const width = this.messageListEl?.clientWidth || 0;
    const widthChanged = this.rowHeightCache.syncViewportWidth(width);
    if (!widthChanged) return false;
    const anchor = this.captureScrollAnchor();
    const viewportOffset = anchor ? this.getRenderedViewportOffset(anchor.key) : null;
    this.rowHeightCache.reset();
    this.rowHeightCache.syncViewportWidth(width);
    if (!anchor || viewportOffset === null) {
      this.resizeAnchorController.cancel();
      this.recalculateVirtualWindow();
      return true;
    }
    this.resizeAnchorController.begin({ ...anchor, viewportOffset, scrollTop: this.messageListEl!.scrollTop });
    const anchorIndex = this.findRenderIndexByKey(anchor.key);
    if (anchorIndex === -1) {
      this.resizeAnchorController.cancel();
      this.recalculateVirtualWindow();
      return true;
    }
    this.renderVirtualWindowAroundIndex(anchorIndex);
    return true;
  }

  private findRenderIndexByMessage(message: ChatUIMessageModel): number {
    return this.messageRenderList.findIndex(item => (
      typeof item !== 'string'
      && this.getMessageUniqueKey(item) === this.getMessageUniqueKey(message)
    ));
  }

  private closeFloatingLayerWhenTargetInvisible() {
    const visible = (message: ChatUIMessageModel | null | undefined) => {
      if (!message) return true;
      const index = this.findRenderIndexByMessage(message);
      return index >= this.virtualStart && index <= this.virtualEnd;
    };
    if (!visible(this.currentSelectMessage)) this.hideMsgMenu();
    if (!visible(this.reactionTargetMessage)) this.hideReactionPanel();
    if (!visible(this.readReceiptMessage)) this.handleCloseReadReceiptModal();
  }

  connectedCallback() {
    super.connectedCallback();
    const context = ctx();
    this.hoveredMessageId = '';
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
    this.readTotalCount = 0;
    this.unreadTotalCount = 0;
    this.readQuery = null;
    this.unreadQuery = null;
    this.readHasMore = false;
    this.unreadHasMore = false;
    this.readLoading = false;
    this.unreadLoading = false;
    this.readReceiptPositionTop = 0;
    this.readReceiptPositionLeft = 0;
    this.readReceiptAnchor = 'top-right';
    this.readReceiptMaxHeight = 420;
    this.messageBubbleCfg = undefined;
    this.hasMoreBackward = false;
    this.multiChoice = false;
    this.selectedUids = [];
    this.showReadReceiptModalMessageUId = '';
    this.reactionPanelDisplay = 'none';
    this.reactionPanelTop = 0;
    this.reactionPanelLeft = 0;
    this.reactionTargetMessage = undefined;
    this.reactionPanelMode = 'reaction';
    this.reactionPanelEditSelect = undefined;
    this.virtualStart = 0;
    this.virtualEnd = -1;
    this.topSpacerHeight = 0;
    this.bottomSpacerHeight = 0;
    this.lastTouchY = undefined;
    this.hasUserScrolledAwayFromBottom = false;
    this.wasStrictlyAtBottomBeforeResize = true;
    this.resetVirtualWindow();

    window.addEventListener('click', this._hideMsgMenu);
    window.addEventListener('click', this._hideReactionPanel);
    window.addEventListener('click', this._handleClickOutside);
    this.checkDevice();
    window.addEventListener('resize', this._checkDevice);
    window.addEventListener('resize', this._updateScrollbar);
    window.addEventListener('resize', this._handleWindowResize);
    context.addEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onSelectedChanged);
    context.addEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
    context.addEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages);
    context.addEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
    context.addEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange);
    context.addEventListener(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL, this._onAdjustMessageListScroll);
    this._unsubscribeMultiChoiceMode = multiChoiceMode.subscribe(() => this.handleMultiChoiceModeChange());
    this.messageBubbleCfg = context.bubble.messageBubbleCfg;
  }

  firstUpdated() {
    this.ensureMessageListObservers();
    void this.initMessageList();
  }

  updated() {
    this.ensureMessageListObservers();
    if (this.messageListEl?.querySelector('.nc-message-edit-status')) this.scheduleVirtualMeasurement();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.handleCloseReadReceiptModal();
    this.longPress.cancel();
    const context = ctx();
    this.messageListGeneration += 1;
    this.cancelPaginationTask();
    this.scrollControl?.enableScroll();
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
    if (this.resizeLayoutTimer) clearTimeout(this.resizeLayoutTimer);
    this.resizeLayoutTimer = undefined;
    this.cancelAdjustMessageListScroll();
    if (this.virtualWindowFrame) cancelAnimationFrame(this.virtualWindowFrame);
    if (this.virtualMeasureFrame) cancelAnimationFrame(this.virtualMeasureFrame);
    this.virtualWindowFrame = 0;
    this.virtualMeasureFrame = 0;
    context.removeEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onSelectedChanged);
    context.removeEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
    context.removeEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages);
    context.removeEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
    context.removeEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange);
    context.removeEventListener(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL, this._onAdjustMessageListScroll);
    this._unsubscribeMultiChoiceMode?.();
    this._unsubscribeMultiChoiceMode = undefined;
    window.removeEventListener('click', this._hideMsgMenu);
    window.removeEventListener('click', this._hideReactionPanel);
    window.removeEventListener('click', this._handleClickOutside);
    window.removeEventListener('resize', this._checkDevice);
    window.removeEventListener('resize', this._updateScrollbar);
    window.removeEventListener('resize', this._handleWindowResize);
    this.resizeRefObserver?.disconnect();
    this.messageRowResizeObserver?.disconnect();
    this.observedMessageRows.clear();
    this.resizeRefObserver = null;
    this.messageRowResizeObserver = null;
    this.observedMessageListEl = undefined;
    this.scrollControl = null;
    this.resizeAnchorController.cancel();
  }

  // ─── i18n helper ───────────────────────────────────────────────────────────
  private $tt(key: keyof LanguagePackEntries, ...args: Array<string | number>): string {
    return this.i18n.t(key, ...args);
  }

  // ─── STT ───────────────────────────────────────────────────────────────────
  private getSTTStatus(messageUId: string): 'converting' | 'success' | 'error' | undefined {
    return sttStatusMap.value[messageUId];
  }

  private getSTTText(messageUId: string): string {
    const text = sttTextMap.value[messageUId] || ctx().speechToTextStore.getSTTText(messageUId) || '';
    return text === '' ? this.$tt('message.speech.to.text.empty') : text;
  }

  private shouldShowSTTStatus(messageUId: string): boolean {
    if (sttHiddenMap.value[messageUId]) return false;
    const status = this.getSTTStatus(messageUId);
    if (status) return true;
    const text = ctx().speechToTextStore.getSTTText(messageUId);
    if (text !== undefined) {
      sttStatusMap.value = { ...sttStatusMap.value, [messageUId]: 'success' };
      sttTextMap.value = { ...sttTextMap.value, [messageUId]: text };
      return true;
    }
    return false;
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
    if (msg.direction === MessageDirection.SEND) {
      const context = ctx();
      const profile = currentUserProfile.value;
      return profile?.userId === context.userId ? profile : context.appData.getUserProfile(context.userId);
    }
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
    const hasVisibleReactions = ctx().isMessageReactionEnabled && item.reactions.length > 0;
    if (
      [MessageType.IMAGE, MessageType.SHORT_VIDEO, MessageType.GIF].includes(item.messageType as any)
      && !hasVisibleReactions
    ) {
      backgroundColor = backgroundColor + '00';
    }
    return { color, backgroundColor, borderRadius };
  }

  private bubbleStyleAlign(item: ChatUIMessageModel): boolean {
    return !!(item.direction === 1 && this.messageBubbleCfg?.layout === 'left-right');
  }

  private canShowReactionEntry(message: ChatUIMessageModel): boolean {
    return ctx().isMessageReactionEnabled && canReactToMessage(message);
  }

  private isMessageEditing(message: ChatUIMessageModel): boolean {
    return !!message.messageId
      && opened.value?.updatingMessageUId === message.messageId;
  }

  private setActiveEditMessage(messageId?: string) {
    const channel = ctx().channelModule.getOpenedChannelModel();
    if (!channel) return;
    if (this.reactionPanelMode === 'edit') this.hideReactionPanel();
    channel.updatingMessageUId = messageId;
    opened.value = channel.clone();
    this.scheduleLayoutUpdate({ measureVirtualRows: true, preserveBottom: true });
  }

  private async startMessageEdit(message: ChatUIMessageModel) {
    const channel = ctx().channelModule.getOpenedChannelModel();
    if (!channel || !message.messageId) return;
    const activeId = channel.updatingMessageUId;
    if (activeId && activeId !== message.messageId) {
      const accepted = await ctx().confirm('alert.message.edit.switch');
      if (!accepted) return;
      const activeMessage = messageList.value.find((item) => item.messageId === activeId);
      if (activeMessage) {
        // Switching after confirmation discards the previous draft silently.
        ctx().message.clearMessageEdit(activeMessage);
      } else {
        this.setActiveEditMessage(undefined);
      }
    }
    this.setActiveEditMessage(message.messageId);
    const draft = message.editDraft !== undefined
      ? message.editDraft
      : getMessageDesc(message);
    ctx().message.setMessageEditDraft(message, draft);
  }

  private handleMessageEditDraft(message: ChatUIMessageModel, draft: string) {
    ctx().message.setMessageEditDraft(message, draft);
  }

  private handleMessageEditResize(
    message: ChatUIMessageModel,
    event: CustomEvent<{ previousBottom: number }>,
  ) {
    if (!this.isMessageEditing(message)) return;
    const previousBottom = event.detail.previousBottom;
    if (!this.messageListEl || !Number.isFinite(previousBottom)) return;

    const editor = event.currentTarget as HTMLElement | null;
    const viewport = this.messageListEl.getBoundingClientRect();
    const editorRect = editor?.getBoundingClientRect();
    if (!editorRect || editorRect.bottom <= viewport.top || editorRect.top >= viewport.bottom) return;

    // Use the actual bottom displacement: shrinking a row may already clamp
    // scrollTop, so applying its height delta again would move the editor.
    this.messageListEl.scrollTop = calculateViewportAnchorScrollTop(
      this.messageListEl.scrollTop,
      editorRect.bottom,
      previousBottom,
    );
    this.syncBottomState();
    this.scheduleLayoutUpdate({ measureVirtualRows: true });
  }

  private handleMessageEditCancel(message: ChatUIMessageModel) {
    ctx().message.clearMessageEdit(message);
    this.setActiveEditMessage(undefined);
  }

  private async handleMessageEditConfirm(message: ChatUIMessageModel, draft: string) {
    if (!draft.trim() || message.editStatus === ChatUIMessageEditStatus.UPDATING) return;
    ctx().message.setMessageEditDraft(message, draft);
    // The visible-control slot is released before the SDK request starts.
    this.setActiveEditMessage(undefined);
    await ctx().message.updateMessage(message, draft);
  }

  private handleMessageEditRetry(message: ChatUIMessageModel) {
    void ctx().message.retryMessageUpdate(message);
  }

  private alignMessageEditStatuses() {
    this.messageListEl?.querySelectorAll<HTMLElement>('.nc-message-edit-status-anchor').forEach((anchor) => {
      const wrapper = anchor.parentElement;
      const body = wrapper?.querySelector('nc-message-bubble')?.shadowRoot
        ?.querySelector<HTMLElement>('.message-body-wrapper');
      const status = anchor.querySelector<HTMLElement>('.nc-message-edit-status');
      if (!body || !status) return;
      // Align to the colored bubble, excluding its timestamp and action buttons.
      const bubbleRect = body.getBoundingClientRect();
      const statusWidth = status.getBoundingClientRect().width;
      const rightAligned = wrapper?.classList.contains('nc-chatui-msg-bubble-wrapper-right');
      // Keep the icon on the bubble's left edge while it fits. For a narrow
      // right-aligned bubble, keep the status on one line and align its text's
      // right edge with the bubble's right edge.
      const left = rightAligned && statusWidth > bubbleRect.width
        ? bubbleRect.right - statusWidth
        : bubbleRect.left;
      status.style.left = `${left - anchor.getBoundingClientRect().left}px`;
    });
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
  private async handleMessageRightClick(message: ChatUIMessageModel, e: MouseEvent | CustomEvent) {
    if (multiChoiceMode.value) return;
    this.hideReactionPanel();
    this.handleCloseReadReceiptModal();

    const mouseEvent = this.getSourceMouseEvent(e);
    if (!mouseEvent) return;
    // currentTarget is cleared after event dispatch, so capture the body before awaiting Lit.
    const bubbleBody = this.isH5 && e.currentTarget instanceof HTMLElement
      ? e.currentTarget.shadowRoot?.querySelector('.message-body-wrapper')
      : undefined;

    this.currentSelectMessage = message;
    const context = ctx();

    let list = context.msgMenu.getMenu(message)
      .filter(item => (!this.isH5 || item.id !== MessageMenuID.EDIT) && (this.isH5 || item.id !== MessageMenuID.REACTIONS))
      .map((item) => ({
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
    await this.updateComplete;
    const menu = this.messageMenuEl;
    if (!menu) return;
    // Parent updates do not wait for the menu items' own Lit updates.
    await Promise.all(Array.from(
      menu.querySelectorAll<LitElement>('nc-message-list-menu-item'),
      item => item.updateComplete,
    ));
    if (!this.isConnected || this.currentSelectMessage !== message || this.messageMenuDisplay !== 'block') return;
    const width = menu.clientWidth;
    const height = menu.clientHeight;
    const position = this.isH5
      ? this.calculateMessageMenuPosition(width, height, mouseEvent, this.bubbleStyleAlign(message), bubbleBody?.getBoundingClientRect())
      : this.calculateActionPopupPosition(width, height, mouseEvent, this.bubbleStyleAlign(message));
    this.messageMenuTop = position.top;
    this.messageMenuLeft = position.left;

    if (this.messageMenuDisplay === 'block') {
      this.scrollControl?.disableScroll();
    }
  }

  private async handleMenuItemClick(
    menuId: string,
    message: ChatUIMessageModel,
    event: MouseEvent | CustomEvent,
  ) {
    const context = ctx();
    switch (menuId) {
      case MessageMenuID.COPY: {
        const text = (message.content as TextMessageContent).text || '';
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          context.emit(new ChatUIEvent(ChatUIEvents.TOAST_EVENT, { message: context.i18n.format('toast.copy.failed'), showIcon: false }));
          break;
        }
        context.emit(new ChatUIEvent(ChatUIEvents.TOAST_EVENT, { message: context.i18n.format('toast.copy.success'), showIcon: true }));
        break;
      }
      case MessageMenuID.DELETE_FOR_ME:
        if (this.isMessageEditing(message)) ctx().message.clearMessageEdit(message, true, true);
        context.message.deleteMessage(message, false); break;
      case MessageMenuID.DELETE_FOR_ALL:
        if (this.isMessageEditing(message)) ctx().message.clearMessageEdit(message, true, true);
        context.message.deleteMessage(message, true); break;
      case MessageMenuID.MULIT_CHOICE:
        multiChoiceMode.value = true; break;
      case MessageMenuID.REPLY:
        replyMessage.value = message; break;
      case MessageMenuID.REACTIONS:
        // Keep the global click listener from closing the panel immediately after it opens.
        event.stopPropagation();
        await this.handleReactionClick(message, event);
        break;
      case MessageMenuID.EDIT:
        this.hideMsgMenu();
        await this.startMessageEdit(message);
        break;
      case MessageMenuID.FORWARD:
        forwarding(ModalForwardingType.SINGLE, [message]); break;
      case MessageMenuID.SPEECH_TO_TEXT:
        if (message.messageId) {
          const newHidden = { ...sttHiddenMap.value };
          delete newHidden[message.messageId];
          sttHiddenMap.value = newHidden;
          const hasConverted = context.speechToTextStore.hasConverted(message.messageId);
          if (hasConverted) {
            const cachedText = context.speechToTextStore.getSTTText(message.messageId) || '';
            sttStatusMap.value = { ...sttStatusMap.value, [message.messageId]: 'success' };
            sttTextMap.value = { ...sttTextMap.value, [message.messageId]: cachedText };
          } else {
            sttStatusMap.value = { ...sttStatusMap.value, [message.messageId]: 'converting' };
            await context.speechToTextStore.requestForMessage(message);
          }
        }
        break;
      case MessageMenuID.CANCEL_SPEECH_TO_TEXT:
        if (message.messageId) {
          sttHiddenMap.value = { ...sttHiddenMap.value, [message.messageId]: true };
          const newStatus = { ...sttStatusMap.value };
          const newText = { ...sttTextMap.value };
          delete newStatus[message.messageId];
          delete newText[message.messageId];
          sttStatusMap.value = newStatus;
          sttTextMap.value = newText;
        }
        break;
      default:
        context.emit(new ChatUIEvent(ChatUIEvents.MESSAGE_MENU_ITEM_CLICK, { id: menuId, message }));
    }
  }

  private hideMsgMenu() {
    this.messageMenuDisplay = 'none';
    this.currentSelectMessage = undefined;
    this.msgMenu = [];
    this.scrollControl?.enableScroll();
  }

  private checkDevice() {
    this.isH5 = isMobileDevice();
    if (this.isH5) this.hideReactionPanel();
  }

  private handleWindowResize() {
    this.hideMsgMenu();
    this.hideReactionPanel();
    this.handleCloseReadReceiptModal();
  }

  private get reactionEmojis(): string[] {
    return ctx().input.chatEmojis.chats;
  }

  private getSourceMouseEvent(event: MouseEvent | CustomEvent): MouseEvent | null {
    if (event instanceof MouseEvent) return event;
    const detail = event.detail as unknown;
    if (detail instanceof MouseEvent) return detail;
    if (Array.isArray(detail) && detail[0] instanceof MouseEvent) {
      return detail[0];
    }
    if (
      detail
      && typeof detail === 'object'
      && 'evt' in detail
      && (detail as { evt?: unknown }).evt instanceof MouseEvent
    ) {
      return (detail as { evt: MouseEvent }).evt;
    }
    return null;
  }

  private findStatusElementInMessageItem(messageItem: HTMLElement | null): HTMLElement | null {
    if (!messageItem) return null;

    const lightDomStatus = messageItem.querySelector<HTMLElement>(
      '.nc-chatui-msg-sent-status, .nc-chatui-message-sent-status',
    );
    if (lightDomStatus) return lightDomStatus;

    const messageBubble = messageItem.querySelector('nc-message-bubble') as HTMLElement | null;
    const bubbleRoot = messageBubble?.shadowRoot;
    if (!bubbleRoot) return null;

    const statusHost = bubbleRoot.querySelector<HTMLElement>('.nc-chatui-msg-sent-status');
    if (statusHost) return statusHost;

    const nestedStatus = bubbleRoot.querySelector('nc-message-sent-status') as HTMLElement | null;
    return nestedStatus?.shadowRoot?.querySelector<HTMLElement>(
      '.nc-chatui-message-sent-status',
    ) || null;
  }

  private findStatusElementFromEvent(event: MouseEvent | undefined): HTMLElement | null {
    if (!event) return null;
    for (const target of event.composedPath()) {
      if (!(target instanceof HTMLElement)) continue;
      if (target.matches('.nc-chatui-msg-sent-status, .nc-chatui-message-sent-status')) {
        return target;
      }
    }
    return null;
  }

  private getBubbleBodyRectByEvent(event: MouseEvent): DOMRect | undefined {
    const target = event.target as HTMLElement | null;
    const rootNode = target?.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      return rootNode.querySelector('.message-body-wrapper')?.getBoundingClientRect();
    }
    return undefined;
  }

  private calculateActionPopupPosition(
    popupWidth: number,
    popupHeight: number,
    event: MouseEvent,
    alignRight: boolean,
    anchorRect?: DOMRect,
  ): { left: number; top: number } {
    if (!this.messageViewportEl) return { left: 0, top: 0 };
    const viewportRect = this.messageViewportEl.getBoundingClientRect();
    const targetRect = anchorRect || (event.target as HTMLElement | null)?.getBoundingClientRect();
    const bubbleBodyRect = this.getBubbleBodyRectByEvent(event);
    const gap = 4;
    const bottomSafeGap = 10;
    const maxLeft = Math.max(0, viewportRect.width - popupWidth);
    const maxTop = Math.max(0, viewportRect.height - popupHeight - bottomSafeGap);

    if (!targetRect) {
      return {
        left: Math.max(0, Math.min(event.clientX - viewportRect.left, maxLeft)),
        top: Math.max(0, Math.min(event.clientY - viewportRect.top, maxTop)),
      };
    }

    const preferredLeft = alignRight
      ? targetRect.left - viewportRect.left - popupWidth - gap
      : targetRect.right - viewportRect.left + gap;
    return {
      left: Math.max(0, Math.min(preferredLeft, maxLeft)),
      top: Math.max(0, Math.min(
        (bubbleBodyRect?.top ?? targetRect.top) - viewportRect.top,
        maxTop,
      )),
    };
  }

  private calculateMessageMenuPosition(
    popupWidth: number,
    popupHeight: number,
    event: MouseEvent,
    alignRight: boolean,
    bubbleRect?: DOMRect,
  ): { left: number; top: number } {
    if (!this.messageViewportEl) return { left: 0, top: 0 };
    const viewport = this.messageViewportEl.getBoundingClientRect();
    const maxLeft = Math.max(0, viewport.width - popupWidth - 10);
    const minLeft = Math.min(10, maxLeft);
    // On H5 Safari the message list can extend behind the input provider while
    // the flex layout is settling. Keep the menu above the input's actual top
    // edge instead of clamping it to the full message-list height.
    const inputProvider = this.parentElement?.querySelector('nc-input-provider') as HTMLElement | null;
    const inputRect = inputProvider?.getBoundingClientRect();
    const inputVisible = !!inputRect && inputRect.height > 0 && inputRect.top < viewport.bottom;
    const availableBottom = inputVisible ? Math.max(viewport.top, inputRect!.top) : viewport.bottom;
    // Keep the same 10px bottom spacing used by the non-H5 popup positioning.
    const bottomSafeGap = 10;
    const maxTop = Math.max(
      0,
      availableBottom - viewport.top - popupHeight - bottomSafeGap,
    );
    const left = bubbleRect
      ? (alignRight ? bubbleRect.left - popupWidth - 4 : bubbleRect.right + 4) - viewport.left
      : event.clientX - viewport.left;
    const top = (bubbleRect?.top ?? event.clientY) - viewport.top;
    return {
      left: Math.max(minLeft, Math.min(left, maxLeft)),
      top: Math.max(0, Math.min(top, maxTop)),
    };
  }

  private calculateCenteredReactionPanelPosition(
    panelWidth: number,
    panelHeight: number,
  ): { left: number; top: number } {
    if (!this.messageViewportEl) return { left: 0, top: 0 };
    return {
      left: Math.max(0, (this.messageViewportEl.clientWidth - panelWidth) / 2),
      top: Math.max(0, (this.messageViewportEl.clientHeight - panelHeight) / 2),
    };
  }

  private calculateEditReactionPanelPosition(
    panelWidth: number,
    panelHeight: number,
    anchorRect?: DOMRect,
  ): { left: number; top: number } {
    if (!this.messageViewportEl || !anchorRect) return { left: 0, top: 0 };
    const viewportRect = this.messageViewportEl.getBoundingClientRect();
    const gap = 8;
    const maxLeft = Math.max(0, viewportRect.width - panelWidth);
    const maxTop = Math.max(0, viewportRect.height - panelHeight);
    return {
      left: Math.max(0, Math.min(anchorRect.right - viewportRect.left - panelWidth, maxLeft)),
      top: Math.max(0, Math.min(anchorRect.top - viewportRect.top - panelHeight - gap, maxTop)),
    };
  }

  private async handleReactionClick(message: ChatUIMessageModel, event: MouseEvent | CustomEvent) {
    if (
      multiChoiceMode.value ||
      !ctx().isMessageReactionEnabled ||
      message.sentStatus !== SentStatus.SENT
    ) return;

    const mouseEvent = this.getSourceMouseEvent(event);
    if (!mouseEvent) return;
    // The menu is hidden before the panel renders, so preserve the trigger position first.
    const anchorRect = (mouseEvent.target as HTMLElement | null)?.getBoundingClientRect();
    this.hideMsgMenu();
    this.handleCloseReadReceiptModal();
    this.reactionTargetMessage = message;
    this.reactionPanelMode = 'reaction';
    this.reactionPanelEditSelect = undefined;
    this.reactionPanelDisplay = 'grid';
    await this.updateComplete;

    const panel = this.reactionPanelEl;
    if (!panel) {
      this.hideReactionPanel();
      return;
    }
    panel.scrollTop = 0;
    const position = this.isH5
      ? this.calculateCenteredReactionPanelPosition(panel.offsetWidth, panel.offsetHeight)
      : this.calculateActionPopupPosition(
        panel.offsetWidth,
        panel.offsetHeight,
        mouseEvent,
        this.bubbleStyleAlign(message),
        anchorRect,
      );
    this.reactionPanelTop = position.top;
    this.reactionPanelLeft = position.left;
  }

  private hideReactionPanel() {
    this.reactionPanelDisplay = 'none';
    this.reactionTargetMessage = undefined;
    this.reactionPanelMode = 'reaction';
    this.reactionPanelEditSelect = undefined;
  }

  private handleReactionEmojiClick(emoji: string) {
    if (this.reactionPanelMode === 'edit') {
      this.reactionPanelEditSelect?.(emoji);
      this.hideReactionPanel();
      return;
    }
    const message = this.reactionTargetMessage;
    if (!message || message.sentStatus !== SentStatus.SENT) return;
    const reaction = message.reactions.find(item => item.reactionId === emoji);
    void ctx().message.updateMessageReaction(
      message,
      emoji,
      !!reaction?.hasCurrentUserReacted,
    );
    this.hideReactionPanel();
  }

  private async handleMessageEditEmojiPanelToggle(
    message: ChatUIMessageModel,
    event: CustomEvent<MessageEditEmojiPanelToggleDetail>,
  ) {
    event.stopPropagation();
    if (this.reactionPanelDisplay !== 'none' && this.reactionPanelMode === 'edit') {
      this.hideReactionPanel();
      return;
    }
    const mouseEvent = event.detail?.evt;
    if (!(mouseEvent instanceof MouseEvent)) return;
    const anchorRect = (mouseEvent.target as HTMLElement | null)?.getBoundingClientRect();
    this.hideMsgMenu();
    this.handleCloseReadReceiptModal();
    this.reactionTargetMessage = message;
    this.reactionPanelMode = 'edit';
    this.reactionPanelEditSelect = event.detail.onSelect;
    this.reactionPanelDisplay = 'grid';
    await this.updateComplete;

    const panel = this.reactionPanelEl;
    if (!panel) {
      this.hideReactionPanel();
      return;
    }
    panel.scrollTop = 0;
    const position = this.calculateEditReactionPanelPosition(
      panel.offsetWidth,
      panel.offsetHeight,
      anchorRect,
    );
    this.reactionPanelTop = position.top;
    this.reactionPanelLeft = position.left;
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
          const foundElement = this.findStatusElementInMessageItem(messageItem);
          if (foundElement) {
            this.readReceiptStatusElement = foundElement;
            statusElement = foundElement;
          } else return;
        } else return;
      } else return;
    }

    const rect = statusElement.getBoundingClientRect();
    const containerRect = this.messageViewportEl.getBoundingClientRect();
    const position = calculateReadReceiptLayout({
      viewportWidth: containerRect.width,
      viewportHeight: containerRect.height,
      statusTop: rect.top - containerRect.top,
      statusBottom: rect.bottom - containerRect.top,
      statusLeft: rect.left - containerRect.left,
      statusRight: rect.right - containerRect.left,
    });
    this.readReceiptPositionTop = position.top;
    this.readReceiptPositionLeft = position.left;
    this.readReceiptAnchor = position.anchor;
    this.readReceiptMaxHeight = position.maxHeight;
  }

  private async handleShowReadReceiptModal(message: ChatUIMessageModel, event?: MouseEvent) {
    this.hideMsgMenu();
    this.hideReactionPanel();
    if (!this.isConnected || !message.messageId || message.channelType !== ChannelType.GROUP) return;

    this.handleCloseReadReceiptModal();
    this.readReceiptMessage = message;
    const readQuery = BaseChannel.createMessagesReadReceiptUsersQuery({
      channelIdentifier: message.channelIdentifier,
      pageSize: 15,
      messageId: message.messageId,
      status: MessageReadReceiptStatus.RESPONDED,
    });
    const unreadQuery = BaseChannel.createMessagesReadReceiptUsersQuery({
      channelIdentifier: message.channelIdentifier,
      pageSize: 15,
      messageId: message.messageId,
      status: MessageReadReceiptStatus.UNRESPONDED,
    });
    this.readQuery = readQuery;
    this.unreadQuery = unreadQuery;
    const isCurrentQuery = () => this.isConnected
      && this.readQuery === readQuery && this.unreadQuery === unreadQuery;

    await this.updateComplete;
    if (!isCurrentQuery()) return;

    let statusElement: HTMLElement | null = null;
    statusElement = this.findStatusElementFromEvent(event);

    if (!statusElement) {
      const messageItem = this.messageListEl?.querySelector(`.nc-chatui-msg-list-item[data-message-uid="${message.messageId}"]`) as HTMLElement;
      if (messageItem) {
        statusElement = this.findStatusElementInMessageItem(messageItem);
      }
    }

    if (statusElement) {
      this.readReceiptStatusElement = statusElement;
      this.updateReadReceiptPosition(statusElement);
    } else {
      const position = calculateReadReceiptFallbackLayout(
        this.messageViewportEl?.clientWidth || 0,
        this.messageViewportEl?.clientHeight || 0,
      );
      this.readReceiptPositionTop = position.top;
      this.readReceiptPositionLeft = position.left;
      this.readReceiptAnchor = position.anchor;
      this.readReceiptMaxHeight = position.maxHeight;
    }

    await Promise.all([this.loadReadUsers(), this.loadUnreadUsers()]);
    if (!isCurrentQuery()) return;
    this.showReadReceiptModal = true;
  }

  private async loadReadUsers() {
    const query = this.readQuery;
    if (!this.isConnected || !query || this.readLoading) return;
    this.readLoading = true;
    const { data } = await query.loadNextPage();
    if (!this.isConnected || this.readQuery !== query) return;
    if (data) {
      this.readUsers = [...this.readUsers, ...(data.data || [])];
      this.readTotalCount = data.totalCount;
      this.readHasMore = query.hasNext;
    }
    this.readLoading = false;
  }

  private async loadUnreadUsers() {
    const query = this.unreadQuery;
    if (!this.isConnected || !query || this.unreadLoading) return;
    this.unreadLoading = true;
    const { data } = await query.loadNextPage();
    if (!this.isConnected || this.unreadQuery !== query) return;
    if (data) {
      this.unreadUsers = [...this.unreadUsers, ...(data.data || [])];
      this.unreadTotalCount = data.totalCount;
      this.unreadHasMore = query.hasNext;
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
    this.readTotalCount = 0;
    this.unreadTotalCount = 0;
    this.readQuery = null;
    this.unreadQuery = null;
    this.readLoading = false;
    this.unreadLoading = false;
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
    this.hideReactionPanel();
    this.handleCloseReadReceiptModal();
    this.showScrollbar = true;
    if (this.scrollbarHideTimer) clearTimeout(this.scrollbarHideTimer);
    if (!this.isHoveringScrollbar) {
      this.scrollbarHideTimer = setTimeout(() => { this.showScrollbar = false; }, 1000);
    }
    if (!opened.value || messageList.value.length === 0) {
      this.cancelPaginationTask();
      return;
    }
    const metrics = this.readMessageListMetrics();
    if (!metrics) return;
    const { scrollHeight, scrollTop, clientHeight } = metrics;
    if (this.resizeAnchorController.peek()) this.paginationAfterScroll = true;
    this.scheduleVirtualWindowUpdate();
    const isAtBottom = this.isStrictlyAtBottom(metrics);
    this.onBottomArea = this.isInBottomArea(metrics);
    // Layout changes can emit scroll events before ResizeObserver recalibrates
    // the bottom. Only user input should cancel an existing bottom lock.
    if (isAtBottom) {
      this.hasUserScrolledAwayFromBottom = false;
      this.wasStrictlyAtBottomBeforeResize = true;
    }
    if (this.hasUserScrolledAwayFromBottom) this.cancelAdjustMessageListScroll();
    this.syncScrollbarPosition(metrics);

    if (scrollTop <= 200 && !this.paginationTask) {
      if (!this.hasMoreForward) return;
      void this.schedulePagination(true);
    }
    if (this.showReadReceiptModal) {
      this.updateReadReceiptPosition(this.readReceiptStatusElement);
    }
    if (this.hasMoreBackward && scrollHeight - scrollTop - clientHeight <= 200) {
      void this.schedulePagination(false);
    }
  }

  private cancelPaginationTask() {
    this.paginationTask = null;
  }

  private async schedulePagination(forward: boolean) {
    const identifier = opened.value?.channelIdentifier;
    if (
      this.paginationTask
      || !identifier
      || !this.isConnected
      || this.resizeAnchorController.peek()?.value.preserveViewport
    ) return;
    const generation = this.messageListGeneration;
    const task = Symbol();
    const isCurrent = () => this.paginationTask === task
      && this.isCurrentMessageList(identifier, generation);
    this.paginationTask = task;
    try {
      if (!isCurrent() || !(forward ? this.hasMoreForward : this.hasMoreBackward)) return;
      const boundary = messageList.value[forward ? 0 : messageList.value.length - 1];
      if (!boundary || !boundary.channelIdentifier.isEqualTo(identifier) || !Number.isFinite(boundary.sentTime)) return;
      const timestamp = ctx().message.getHistoryPageTimestamp(identifier, messageList.value, forward);
      if (forward) {
        await this.moreForward(identifier, timestamp, isCurrent);
      } else {
        await this.moreBackward(identifier, timestamp, isCurrent);
      }
    } finally {
      // A canceled task must not release a newer task's pagination lock.
      if (this.paginationTask === task) this.paginationTask = null;
    }
  }

  private handleUserScrollInput(event: Event) {
    if (this.scrollControl?.isScrollDisabled) return;
    let isScrollingUp = false;
    if (event.type === 'wheel') {
      isScrollingUp = (event as WheelEvent).deltaY < 0;
    } else if (event.type === 'touchstart' || event.type === 'touchmove') {
      const touches = (event as TouchEvent).touches;
      const touchY = touches.length === 1 ? touches[0].clientY : undefined;
      isScrollingUp = event.type === 'touchmove'
        && touchY !== undefined
        && this.lastTouchY !== undefined
        && touchY > this.lastTouchY;
      this.lastTouchY = touchY;
    } else if (event.type === 'keydown') {
      const { key, shiftKey } = event as KeyboardEvent;
      isScrollingUp = ['ArrowUp', 'PageUp', 'Home'].includes(key) || (key === ' ' && shiftKey);
    }
    if (!isScrollingUp || !this.messageListEl || this.messageListEl.scrollTop <= 0) return;
    this.hasUserScrolledAwayFromBottom = true;
    this.wasStrictlyAtBottomBeforeResize = false;
    this.cancelAdjustMessageListScroll();
  }

  private async moreForward(identifier: ChannelIdentifier, timestamp: number, isCurrent: () => boolean) {
    const { hasMore, code, list } = await ctx().message.reqHistories(
      identifier, timestamp, true
    );
    if (!isCurrent()) return;
    if (code === NCChatUICode.SUCCESS) {
      const anchor = this.capturePaginationAnchor();
      const merged = this.mergeMessagesByUniqueKey(list, messageList.value);
      messageList.value = merged.slice(0, 300);
      this.hasMoreForward = hasMore;
      if (merged.length > 300) this.hasMoreBackward = true;
      if (this.unreadCountTop) {
        const count = this.unreadCountTop - list.length;
        this.unreadCountTop = count < 0 ? 0 : count;
      }
      await this.refreshVirtualWindow(anchor);
      if (!isCurrent()) return;
      this.restorePaginationAnchor(anchor);
    }
  }

  private async moreBackward(identifier: ChannelIdentifier, timestamp: number, isCurrent: () => boolean) {
    const { hasMore, code, list } = await ctx().message.reqHistories(
      identifier, timestamp, false
    );
    if (!isCurrent()) return;
    if (code === NCChatUICode.SUCCESS) {
      const anchor = this.capturePaginationAnchor();
      const merged = this.mergeMessagesByUniqueKey(messageList.value, list);
      messageList.value = merged.slice(-300);
      this.hasMoreBackward = hasMore;
      if (merged.length > 300) this.hasMoreForward = true;
      await this.refreshVirtualWindow(anchor);
      if (!isCurrent()) return;
      this.restorePaginationAnchor(anchor);
      if (unreadCountBottom.value) {
        if (!hasMore) {
          await ctx().channelModule.clearUnreadCountByTimestamp(identifier);
          if (!isCurrent()) return;
          await ctx().message.sendReadReceiptMessage(identifier, list);
          if (!isCurrent()) return;
        }
      }
    }
  }

  private handleMove(e: CustomEvent) {
    if (this.scrollControl?.isScrollDisabled) return;
    if (!this.messageListEl) return;
    this.resizeAnchorController.cancel();
    const thumbPositionPercentage = e.detail[0];
    this.messageListEl.scrollTop = (thumbPositionPercentage * this.messageListEl.scrollHeight) / 100;
    this.scheduleVirtualWindowUpdate();
    this.syncBottomState();
    this.syncScrollbarPosition();
  }

  private updateScrollbar(metrics = this.readMessageListMetrics()): MessageListMetrics | null {
    if (!metrics) return null;
    const original = metrics.offsetHeight ** 2 / Math.max(metrics.scrollHeight, 1);
    const originalHeight = Math.floor(original * 100) / 100;
    const height = Math.max(originalHeight, 20);
    const originalTrack = metrics.offsetHeight - originalHeight;
    const renderedTrack = metrics.offsetHeight - height;
    const ratio = originalTrack > 0 && renderedTrack > 0
      ? originalHeight / originalTrack / (height / renderedTrack)
      : 1;
    this.ratioY = Math.floor(ratio * 100) / 100 || 1;
    this.sizeHeight = originalHeight < metrics.offsetHeight ? Math.floor(height) : 0;
    return metrics;
  }

  private syncScrollbarPosition(metrics = this.readMessageListMetrics()): MessageListMetrics | null {
    const latest = this.updateScrollbar(metrics);
    if (!latest) return null;
    if (!this.sizeHeight || latest.scrollTop <= 0) {
      this.moveY = 0;
      return latest;
    }
    if (this.getDistanceFromBottom(latest) <= 2) {
      this.moveY = ((latest.offsetHeight - this.sizeHeight) * 100) / this.sizeHeight;
      return latest;
    }
    this.moveY = ((latest.scrollTop * 100) / latest.offsetHeight) * this.ratioY || 0;
    return latest;
  }

  /** Match handleScroll by using clientHeight so height differences do not clip the last message. */
  private scrollMessageListToBottom() {
    if (!this.messageListEl) return;
    const metrics = this.syncScrollbarPosition();
    if (!metrics) return;
    this.messageListEl.scrollTop = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
    this.onBottomArea = true;
    this.hasUserScrolledAwayFromBottom = false;
    this.wasStrictlyAtBottomBeforeResize = true;
    this.recalculateVirtualWindow();
    this.syncScrollbarPosition();
  }

  /** Snap to the bottom again after child components or images increase scrollHeight asynchronously. */
  private scheduleScrollToBottomAfterPaint() {
    this.scheduleBottomResync();
  }

  private async setScroll2bottom() {
    this.resizeAnchorController.cancel();
    await this.refreshVirtualWindow();
    this.scrollMessageListToBottom();
    await this.updateComplete;
    this.scheduleVirtualMeasurement();
    await this.settleMessageListToBottom();
  }

  private handleResizeRef() {
    this.scheduleResizeLayoutUpdate();
  }

  private handleAdjustMessageListScroll() {
    if (!this.messageListEl) return;
    this.scheduleLayoutUpdate({
      measureVirtualRows: true,
      preserveBottom: true,
    });
  }

  private cancelAdjustMessageListScroll() {
    if (this.adjustScrollFrame) cancelAnimationFrame(this.adjustScrollFrame);
    if (this.adjustScrollWriteFrame) cancelAnimationFrame(this.adjustScrollWriteFrame);
    if (this.bottomResyncFrame) cancelAnimationFrame(this.bottomResyncFrame);
    this.adjustScrollFrame = 0;
    this.adjustScrollWriteFrame = 0;
    this.bottomResyncFrame = 0;
    this.layoutRefreshRequested = false;
    this.layoutMeasurementRequested = false;
    this.layoutBottomPreservationRequested = false;
  }

  private scheduleLayoutUpdate({
    refreshVirtualWindow = false,
    measureVirtualRows = false,
    preserveBottom = false,
  }: {
    refreshVirtualWindow?: boolean;
    measureVirtualRows?: boolean;
    preserveBottom?: boolean;
  } = {}) {
    this.layoutRefreshRequested ||= refreshVirtualWindow;
    this.layoutMeasurementRequested ||= measureVirtualRows;
    this.layoutBottomPreservationRequested ||= preserveBottom;
    void this.updateComplete.then(() => this.queueLayoutUpdate());
  }

  private scheduleResizeLayoutUpdate() {
    if (this.resizeLayoutTimer) clearTimeout(this.resizeLayoutTimer);
    this.resizeLayoutTimer = setTimeout(() => {
      this.resizeLayoutTimer = undefined;
      this.scheduleLayoutUpdate({
        refreshVirtualWindow: true,
        measureVirtualRows: true,
        preserveBottom: true,
      });
    }, 100);
  }

  private queueLayoutUpdate() {
    if (
      !this.isConnected
      || !this.messageListEl
      || this.adjustScrollFrame
      || this.adjustScrollWriteFrame
    ) return;
    this.adjustScrollFrame = requestAnimationFrame(() => {
      this.adjustScrollFrame = 0;
      if (!this.isConnected || !this.messageListEl) return;

      const refreshVirtualWindow = this.layoutRefreshRequested;
      const measureVirtualRows = this.layoutMeasurementRequested;
      const preserveBottom = this.layoutBottomPreservationRequested;
      this.layoutRefreshRequested = false;
      this.layoutMeasurementRequested = false;
      this.layoutBottomPreservationRequested = false;

      const metrics = this.readMessageListMetrics();
      const shouldKeepBottom = !!metrics
        && preserveBottom
        && this.wasStrictlyAtBottomBeforeResize
        && !this.hasUserScrolledAwayFromBottom;

      if (refreshVirtualWindow) {
        if (!this.invalidateVirtualHeightsForWidthChange()) this.recalculateVirtualWindow();
      }
      if (measureVirtualRows && !shouldKeepBottom && !this.resizeAnchorController.peek()) {
        const anchor = this.captureScrollAnchor();
        const viewportOffset = anchor ? this.getRenderedViewportOffset(anchor.key) : null;
        if (anchor && viewportOffset !== null) {
          this.resizeAnchorController.begin({ ...anchor, viewportOffset, scrollTop: this.messageListEl!.scrollTop });
        }
      }

      this.adjustScrollWriteFrame = requestAnimationFrame(() => {
        this.adjustScrollWriteFrame = 0;
        if (!this.isConnected || !this.messageListEl) return;
        const latest = this.syncScrollbarPosition();
        if (latest && shouldKeepBottom && !this.hasUserScrolledAwayFromBottom) {
          this.scrollMessageListToBottom();
          this.scheduleBottomResync();
        }
        if (measureVirtualRows) this.scheduleVirtualMeasurement();
        if (
          this.layoutRefreshRequested
          || this.layoutMeasurementRequested
          || this.layoutBottomPreservationRequested
        ) {
          void this.updateComplete.then(() => this.queueLayoutUpdate());
        }
      });
    });
  }

  private scheduleBottomResync() {
    if (!this.isConnected || !this.messageListEl || this.bottomResyncFrame) return;
    this.bottomResyncFrame = requestAnimationFrame(() => {
      this.bottomResyncFrame = 0;
      if (!this.isConnected) return;
      void this.settleMessageListToBottom(3);
    });
  }

  private waitForNextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  private async settleMessageListToBottom(retryCount = 2) {
    if (!this.isConnected || !this.messageListEl || this.hasUserScrolledAwayFromBottom) return;
    for (let index = 0; index < retryCount; index += 1) {
      await this.waitForNextFrame();
      if (!this.isConnected) return;
      const metrics = this.syncScrollbarPosition();
      if (!metrics || !this.messageListEl || this.hasUserScrolledAwayFromBottom) return;
      const target = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
      if (Math.abs(this.messageListEl.scrollTop - target) > 1) {
        this.messageListEl.scrollTop = target;
      }
      this.recalculateVirtualWindow();
      await this.updateComplete;
      this.scheduleVirtualMeasurement();
      if (this.isStrictlyAtBottom(this.readMessageListMetrics() || metrics)) break;
    }
    if (this.messageListEl && !this.hasUserScrolledAwayFromBottom) {
      this.onBottomArea = true;
      this.hasUserScrolledAwayFromBottom = false;
      this.wasStrictlyAtBottomBeforeResize = true;
    }
  }

  private _useResizeObserver(el: HTMLElement, callback: ResizeObserverCallback): ResizeObserver | null {
    if (window && 'ResizeObserver' in window && el) {
      const observer = new ResizeObserver(callback);
      observer.observe(el);
      return observer;
    }
    return null;
  }

  private ensureMessageListObservers() {
    if (this.observedMessageListEl !== this.messageListEl) {
      this.scrollControl?.enableScroll();
      this.resizeRefObserver?.disconnect();
      this.observedMessageListEl = this.messageListEl;
      this.scrollControl = this.messageListEl
        ? createScrollControl({ value: this.messageListEl })
        : null;
      this.resizeRefObserver = this.messageListEl
        ? this._useResizeObserver(this.messageListEl, () => this.handleResizeRef())
        : null;
    }
    this.syncMessageRowResizeObserver();
  }

  private syncMessageRowResizeObserver() {
    if (!this.messageListEl) {
      this.observedMessageRows.forEach(row => this.messageRowResizeObserver?.unobserve(row));
      this.observedMessageRows.clear();
      return;
    }
    if (typeof ResizeObserver === 'undefined') return;
    if (!this.messageRowResizeObserver) {
      this.messageRowResizeObserver = new ResizeObserver(() => {
        if (!this.resizeLayoutTimer) this.scheduleVirtualMeasurement();
      });
    }

    const renderedRows = new Set(
      Array.from(this.messageListEl.querySelectorAll<HTMLElement>('.nc-chatui-msg-list-box[data-virtual-index]')),
    );
    this.observedMessageRows.forEach((row) => {
      if (!renderedRows.has(row)) this.messageRowResizeObserver?.unobserve(row);
    });
    renderedRows.forEach((row) => {
      if (!this.observedMessageRows.has(row)) this.messageRowResizeObserver?.observe(row);
    });
    this.observedMessageRows = renderedRows;
  }

  // ─── Location buttons ──────────────────────────────────────────────────────
  private async handleLocation2Bottom() {
    if (!opened.value) return;
    this.resizeAnchorController.cancel();
    const channelIdentifier = opened.value!.channelIdentifier;
    this.cancelPaginationTask();
    const generation = ++this.messageListGeneration;
    const { code, list, hasMore } = await ctx().message.reqHistories(channelIdentifier, 0, true);
    if (!this.isCurrentMessageList(channelIdentifier, generation)) return;
    if (code === NCChatUICode.SUCCESS) {
      // Also invalidate pagination started while the latest window was loading.
      this.cancelPaginationTask();
      messageList.value.length = 0;
      messageList.value = list;
      this.hasMoreForward = hasMore;
      this.hasMoreBackward = false;
      await this.setScroll2bottom();
      await ctx().channelModule.clearUnreadCountByTimestamp(channelIdentifier);
      await ctx().message.sendReadReceiptMessage(channelIdentifier, list);
    }
  }

  private async handleLocation2Top() {
    if (!opened.value) return;
    this.resizeAnchorController.cancel();
    const channelIdentifier = opened.value.channelIdentifier;
    const generation = this.messageListGeneration;
    this.unreadCountTop = 0;
    this.hasMoreBackward = true;
    this.updateScrollbar();
    const list = await this.handleReqHistories(
      this.backupFirstUnreadMessageTime,
      true,
      () => this.isCurrentMessageList(channelIdentifier, generation),
    );
    if (!this.isCurrentMessageList(channelIdentifier, generation)) return;
    if (!list.length) return;
    await ctx().message.sendReadReceiptMessage(channelIdentifier, list);
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
    return result.sort((a, b) => a.sentTime - b.sentTime
      || (a.transactionId ?? 0) - (b.transactionId ?? 0));
  }

  private isCurrentMessageList(identifier: ChannelIdentifier, generation: number): boolean {
    return this.isConnected
      && generation === this.messageListGeneration
      && !!opened.value
      && opened.value.channelIdentifier.isEqualTo(identifier);
  }

  private async handleReqHistories(
    timestamp: number,
    backward: boolean,
    isCurrent?: () => boolean,
  ): Promise<ChatUIMessageModel[]> {
    this.resizeAnchorController.cancel();
    const context = ctx();
    const channelIdentifier = opened.value?.channelIdentifier;
    if (!channelIdentifier) return [];
    const generation = this.messageListGeneration;
    const guard = isCurrent || (() => this.isCurrentMessageList(channelIdentifier, generation));
    if (backward) {
      const { code: code1, list, hasMore: hasMore1 } = await context.message.reqHistories(channelIdentifier, timestamp - 1, false);
      if (!guard()) return messageList.value;
      if (code1 === NCChatUICode.SUCCESS) {
        this.hasMoreBackward = hasMore1;
        messageList.value = this.mergeMessagesByUniqueKey(list);
        await this.refreshVirtualWindow();
        this.syncScrollbarPosition();
      }
    }
    const anchor = backward ? this.captureScrollAnchor() : null;
    const { code, list, hasMore } = await context.message.reqHistories(channelIdentifier, timestamp, true);
    if (!guard()) return messageList.value;
    if (code === NCChatUICode.SUCCESS) {
      messageList.value = this.mergeMessagesByUniqueKey(list, messageList.value);
      this.hasMoreForward = hasMore;
      await this.refreshVirtualWindow();
      if (backward) {
        this.restoreScrollAnchor(anchor);
      } else {
        this.scrollMessageListToBottom();
        this.scheduleScrollToBottomAfterPaint();
      }
    }
    return messageList.value;
  }

  private async initMessageList() {
    this.cancelPaginationTask();
    const generation = ++this.messageListGeneration;
    if (!opened.value) return;
    const context = ctx();
    const { channelIdentifier, unreadCount } = opened.value;
    const isCurrent = () => this.isCurrentMessageList(channelIdentifier, generation);
    this.resetVirtualWindow();
    messageList.value = [];
    this.firstUnreadMessageTime = 0;
    unreadCountBottom.value = unreadCount;

    const backward = !this.FOCUS_ON_LATEST_MESSAGE && this.firstUnreadMessageTime > 0;
    const list = await this.handleReqHistories(this.firstUnreadMessageTime, backward, isCurrent);
    if (!isCurrent()) return;

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
  private handleMultiChoiceModeChange() {
    if (!multiChoiceMode.value) {
      // The input replaces the multi-choice menu in the parent flex layout.
      this.scheduleLayoutUpdate({
        refreshVirtualWindow: true,
        measureVirtualRows: true,
        preserveBottom: true,
      });
      return;
    }
    this.hoveredMessageId = '';
    this.longPress.cancel();
    this.hideMsgMenu();
    this.hideReactionPanel();
    this.handleCloseReadReceiptModal();
    ctx().audioPlayer.pause();
  }

  private stopEventWhenMultiChoiceMode(evt: Event) {
    if (!multiChoiceMode.value) return;
    if (evt.type === 'touchstart') this.resizeAnchorController.cancel();
    if (evt.type === 'click' || evt.type === 'contextmenu') evt.preventDefault();
    evt.stopImmediatePropagation();
  }

  private handleSelectMessages() {
    if (!this.messageViewportEl || !this.messageListEl || !this.selectEl) return;
    const listRect = this.messageListEl.getBoundingClientRect();
    const selectedY = this.selectEl.getBoundingClientRect().top - listRect.top;
    const boxStyle = this.messageBoxEl ? window.getComputedStyle(this.messageBoxEl) : null;
    const paddingTop = boxStyle ? Number.parseFloat(boxStyle.paddingTop) || 0 : 0;
    const selectedContentY = this.messageListEl.scrollTop + selectedY - paddingTop;
    const shouldSelect = selected.value;
    const renderList = this.messageRenderList;
    for (let index = renderList.length - 1; index >= 0; index -= 1) {
      if (this.getHeightBeforeIndex(index) <= selectedContentY) break;
      const item = renderList[index];
      if (
        typeof item === 'string'
        || item.sentStatus === 10
        || isGreyMessage(item.messageType)
      ) continue;
      this.setMessageCheckedStatus(item, shouldSelect);
    }
    selected.value = !selected.value;
  }

  private setMessageCheckedStatus(message: ChatUIMessageModel, checked: boolean) {
    const value = message.messageId || `${message.transactionId}`;
    if (checked) {
      const index = selectedMessageUids.value.findIndex(item => value === item);
      if (index === -1) {
        selectedMessageUids.value = [value, ...selectedMessageUids.value];
      }
    } else {
      selectedMessageUids.value = selectedMessageUids.value.filter(item => item !== value);
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────
  private async onDeleteMessages({ data }: MessagesDeletedEvent) {
    const anchor = this.captureScrollAnchor();
    const shouldStick = !!this.readMessageListMetrics()
      && this.isStrictlyAtBottom(this.readMessageListMetrics()!);
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
      if (newList.length === 0) this.cancelPaginationTask();
      messageList.value = newList;
      selectedMessageUids.value = newUids;
      await this.refreshVirtualWindow();
      if (shouldStick) await this.settleMessageListToBottom();
      else this.restoreScrollAnchor(anchor);
    }
  }

  private onMessageStateChange(e: MessageStateChangeEvent) {
    const metrics = this.readMessageListMetrics();
    const shouldStick = !!metrics && this.isStrictlyAtBottom(metrics) && !this.hasMoreBackward;
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
    this.scheduleVirtualWindowUpdate();
    if (shouldStick) {
      this.onBottomArea = true;
      this.hasUserScrolledAwayFromBottom = false;
      this.wasStrictlyAtBottomBeforeResize = true;
      this.scheduleBottomResync();
    }
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
    const metrics = this.readMessageListMetrics();
    if (!metrics || !this.isStrictlyAtBottom(metrics) || this.hasMoreBackward) {
      this.hasMoreBackward = true;
      return;
    }
    messageList.value = this.mergeMessagesByUniqueKey(messageList.value, msgList);
    void this.setScroll2bottom();
    setTimeout(async () => {
      const { code } = await ctx().channelModule.clearUnreadCountByTimestamp(channelIdentifier);
      if (code === NCChatUICode.SUCCESS) {
        await ctx().message.sendReadReceiptMessage(channelIdentifier, msgList);
      }
    }, 100);
  }

  private async onInsertNewMessages(e: InsertNewMessagesEvent) {
    if (this.hasMoreBackward) {
      const channelIdentifier = opened.value?.channelIdentifier;
      if (!channelIdentifier) return;
      this.cancelPaginationTask();
      const generation = ++this.messageListGeneration;
      const { code, list, hasMore } = await ctx().message.reqHistories(channelIdentifier, 0, true);
      if (
        code === NCChatUICode.SUCCESS
        && this.isCurrentMessageList(channelIdentifier, generation)
      ) {
        // Also invalidate pagination started while the latest window was loading.
        this.cancelPaginationTask();
        messageList.value.length = 0;
        messageList.value = this.mergeMessagesByUniqueKey(list);
        this.hasMoreForward = hasMore;
        this.hasMoreBackward = false;
        void this.setScroll2bottom();
      }
      return;
    }
    e.data.forEach(async (item) => {
      if (opened.value!.channelIdentifier.isEqualTo(item.channelIdentifier)) {
        messageList.value = this.mergeMessagesByUniqueKey(messageList.value, [item]);
        if (messageList.value.length > 300) {
          messageList.value = messageList.value.slice(-300);
          this.hasMoreForward = true;
        }
        void this.setScroll2bottom();
      }
    });
  }

  private onSelectedChanged(_e: ChannelSelectedEvent) {
    this.cancelAdjustMessageListScroll();
    this.resetVirtualWindow();
    this.hideMsgMenu();
    this.hideReactionPanel();
    this.handleCloseReadReceiptModal();
    this.hasMoreForward = true;
    this.hasMoreBackward = false;
    this.onBottomArea = true;
    this.hasUserScrolledAwayFromBottom = false;
    this.wasStrictlyAtBottomBeforeResize = true;
    this.lastTouchY = undefined;
    multiChoiceMode.value = false;
    this.unreadCountTop = 0;
    void this.initMessageList();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  render() {
    if (!opened.value) return nothing;
    const renderList = this.messageRenderList;
    return html`
      <div class="nc-chatui-msg-list">
        <div
          class="nc-chatui-msg-list-scroll"
          @scroll=${() => this.handleScroll()}
          @wheel=${this._handleUserScrollInput}
          @touchstart=${this._handleUserScrollInput}
          @touchmove=${this._handleUserScrollInput}
          @keydown=${this._handleUserScrollInput}
        >
          <div class="nc-chatui-msg-list-box-container" style="padding: 10px;">
            ${this.topSpacerHeight > 0 ? html`
              <div class="nc-chatui-msg-list-spacer" style="height: ${this.topSpacerHeight}px"></div>
            ` : nothing}
            ${repeat(
              this.virtualRenderList,
              ({ key }) => key,
              ({ item, index, key }) => html`
                <div
                  class="nc-chatui-msg-list-box ${typeof item !== 'string' && this.isMessageEditing(item) && !this.isH5 ? 'nc-chatui-msg-list-box-edit' : ''}"
                  data-key=${key}
                  data-virtual-index=${index}
                >
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
                      @click=${this._blockMultiChoiceMouseEvent}
                      @contextmenu=${this._blockMultiChoiceMouseEvent}
                      @touchstart=${this._blockMultiChoiceTouchEvent}
                      @touchmove=${this._blockMultiChoiceTouchEvent}
                      @touchend=${this._blockMultiChoiceTouchEvent}
                      @touchcancel=${this._blockMultiChoiceTouchEvent}
                      .message=${item}
                    ></nc-grey-message-provider>
                  ` : html`
                    <div
                      class="nc-chatui-msg-list-item"
                      data-message-uid=${item.messageId || ''}
                      style="flex-direction: ${this.bubbleDirection(item)}"
                      @click=${this._blockMultiChoiceMouseEvent}
                      @contextmenu=${this._blockMultiChoiceMouseEvent}
                      @touchstart=${this._blockMultiChoiceTouchEvent}
                      @touchmove=${this._blockMultiChoiceTouchEvent}
                      @touchend=${this._blockMultiChoiceTouchEvent}
                      @touchcancel=${this._blockMultiChoiceTouchEvent}
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

                      <div class="nc-chatui-msg-bubble-wrapper ${this.bubbleStyleAlign(item) ? 'nc-chatui-msg-bubble-wrapper-right' : ''} ${this.isMessageEditing(item) ? 'nc-chatui-msg-bubble-wrapper-edit' : ''}">
                        ${this.isMessageEditing(item) && !this.isH5 ? html`
                          <nc-message-edit-provider
                            .message=${item}
                            @draft-change=${(e: CustomEvent<string>) => this.handleMessageEditDraft(item, e.detail)}
                            @edit-resize=${(e: CustomEvent<{ previousBottom: number }>) => this.handleMessageEditResize(item, e)}
                            @emoji-panel-toggle=${(e: CustomEvent<MessageEditEmojiPanelToggleDetail>) => this.handleMessageEditEmojiPanelToggle(item, e)}
                            @cancel=${() => this.handleMessageEditCancel(item)}
                            @confirm=${(e: CustomEvent<string>) => this.handleMessageEditConfirm(item, e.detail)}
                          ></nc-message-edit-provider>
                        ` : html`<nc-message-bubble
                          class="nc-chatui-msg-bubble ${item.editStatus === ChatUIMessageEditStatus.UPDATING || item.editStatus === ChatUIMessageEditStatus.FAILED ? 'nc-chatui-msg-bubble-with-edit-status' : ''}"
                          .showname=${this.bubbleShowName(item)}
                          .align=${this.bubbleStyleAlign(item)}
                          .message=${item}
                          .profile=${this.handleUserProfiles(item)}
                          .isH5=${this.isH5}
                          .showSentStatus=${handleShowSentStatus(item)}
                          .reactionEnabled=${this.canShowReactionEntry(item)}
                          .bubbleColorStyle=${this.bubbleColorStyle(item, this.showAvatar(item, renderList[index - 1]))}
                          .contentLayout=${getMessageBubbleContentLayout(item.messageType)}
                          .menuActive=${this.messageMenuDisplay === 'block' && this.currentSelectMessage?.messageId === item.messageId}
                          .reactionBoardActive=${this.reactionPanelMode === 'reaction' && this.reactionPanelDisplay !== 'none' && this.reactionTargetMessage?.messageId === item.messageId}
                          .isItemHover=${!multiChoiceMode.value && this.hoveredMessageId === item.messageId}
                          @sent-status-click=${(e: CustomEvent) => this.handleResendMessage(item, this.getSourceMouseEvent(e) || undefined)}
                          @menu-click=${(e: CustomEvent) => this.handleMessageRightClick(item, e)}
                          @reaction-click=${(e: CustomEvent) => this.handleReactionClick(item, e)}
                          @contextmenu=${(e: MouseEvent) => { e.preventDefault(); this.handleMessageRightClick(item, e); }}
                          @touchstart=${this.longPress.start}
                          @touchmove=${this.longPress.move}
                          @touchend=${this.longPress.end}
                          @touchcancel=${this.longPress.cancel}
                          >
                          ${(() => {
                            const tag = getMessageComponentTag(item.messageType);
                            if (!tag) return nothing;
                            const tagName = unsafeStatic(tag);
                            return staticHtml`<${tagName}
                              .message=${item}
                              @click=${() => this.handleBubbleClick(item)}
                              @link=${(e: CustomEvent) => this.handleLinkClick(e)}
                            ></${tagName}>`;
                          })()}
                        </nc-message-bubble>
                        ${item.editStatus === ChatUIMessageEditStatus.UPDATING || item.editStatus === ChatUIMessageEditStatus.FAILED ? html`
                          <div class="nc-message-edit-status-anchor">
                            ${item.editStatus === ChatUIMessageEditStatus.UPDATING ? html`
                              <div class="nc-message-edit-status" role="status">
                                <img class="nc-message-edit-spinner" src=${MESSAGE_EDIT_UPDATING_ICON} alt="" aria-hidden="true">
                                <span>${this.$tt('message.edit.updating')}</span>
                              </div>
                            ` : html`
                              <button class="nc-message-edit-status nc-message-edit-retry" type="button" @click=${(event: MouseEvent) => {
                                event.stopPropagation();
                                this.handleMessageEditRetry(item);
                              }}>
                                <img src=${MESSAGE_EDIT_FAILED_ICON} alt="" aria-hidden="true">
                                <span>${this.$tt('message.edit.retry')}</span>
                              </button>
                            `}
                          </div>
                        ` : nothing}`}

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
                                  ${sttErrorCodeMap.value[item.messageId] === NCChatUICode.SPEECH_TO_TEXT_MESSAGE_CONTENT_UNSUPPORTED
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
              `,
            )}
            ${this.bottomSpacerHeight > 0 ? html`
              <div class="nc-chatui-msg-list-spacer" style="height: ${this.bottomSpacerHeight}px"></div>
            ` : nothing}
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
                  @click=${(event: MouseEvent) => this.handleMenuItemClick(item.id, item.message, event)}
                ></nc-message-list-menu-item>
              `)}
            </div>
          ` : nothing}
        </div>

        ${this.reactionPanelDisplay !== 'none' ? html`
          <nc-reaction-emoji-panel-provider
            class="nc-reaction-panel"
            .emojis=${this.reactionEmojis}
            style="top: ${this.reactionPanelTop}px; left: ${this.reactionPanelLeft}px; display: block"
            @mouseleave=${() => this.hideReactionPanel()}
            @emoji-select=${(event: CustomEvent<string>) => this.handleReactionEmojiClick(event.detail)}
          ></nc-reaction-emoji-panel-provider>
        ` : nothing}

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
            .readTotalCount=${this.readTotalCount}
            .unreadTotalCount=${this.unreadTotalCount}
            .readLoading=${this.readLoading}
            .unreadLoading=${this.unreadLoading}
            .position=${{ top: this.readReceiptPositionTop, left: this.readReceiptPositionLeft, anchor: this.readReceiptAnchor, maxHeight: this.readReceiptMaxHeight }}
            @close=${() => this.handleCloseReadReceiptModal()}
            @read-status-scroll=${(e: CustomEvent) => this.onReadReceiptScroll(e)}
          ></nc-read-receipt-modal>
        ` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host { display: block; height: 100%; --message-list-padding: 10px; --message-list-gap: 10px; }
    p { margin: 0; }
    ul, li { padding: 0; margin: 0; list-style: none; }
    .nc-chatui-msg-list { position: relative; overflow: hidden; height: 100%; box-sizing: border-box; }
    .nc-chatui-msg-list-scroll { overflow-y: scroll; overflow-x: hidden; overflow-anchor: none; height: 100%; scrollbar-width: none; box-sizing: border-box; }
    .nc-chatui-msg-list-scroll::-webkit-scrollbar { display: none; }
    .nc-chatui-msg-list-box-container { padding: var(--message-list-padding); }
    .nc-chatui-msg-list-item { display: flex; width: 100%; min-width: 0; }
    .nc-chatui-grey-message { flex: 1; text-align: center; }
    .nc-chatui-msg-avatar { padding: 0 8px; flex-shrink: 0; }
    .nc-chatui-msg-bubble-wrapper { display: flex; flex-direction: column; min-width: 0; max-width: 70%; align-items: flex-start; }
    .nc-chatui-msg-bubble-wrapper-edit { flex: 1 1 90%; width: 90%; min-width: 0; max-width: 90%; }
    .nc-chatui-msg-bubble-wrapper-right { align-items: flex-end; }
    .nc-chatui-msg-bubble { padding-bottom: var(--message-list-gap); border-radius: 8px 0 8px; font-size: 12px; line-height: 16px; min-width: 0; max-width: 100%; }
    .nc-chatui-msg-bubble-with-edit-status { padding-bottom: 0; }
    .nc-message-edit-status-anchor {
      /* Keep status text from changing the bubble's intrinsic width. */
      width: 0;
      align-self: flex-start;
      margin: 4px 0 var(--message-list-gap);
    }
    .nc-message-edit-status {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
      width: max-content;
      white-space: nowrap;
      margin: 0;
      padding: 0;
      border: 0;
      color: #0047FF;
      background: transparent;
      font-family: inherit;
      font-size: 12px;
      line-height: 20px;
      text-align: start;
    }
    .nc-message-edit-status img { display: block; flex: 0 0 12px; width: 12px; height: 12px; }
    .nc-message-edit-retry { color: #FF5A50; cursor: pointer; }
    .nc-message-edit-retry:focus-visible { outline: 2px solid #0047FF; outline-offset: 2px; }
    .nc-message-edit-spinner { animation: nc-message-edit-rotate 1s linear infinite; }
    @keyframes nc-message-edit-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @media (max-width: 768px) { .nc-chatui-msg-bubble { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; } }
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
    .nc-reaction-panel { position: absolute; top: 0; left: 0; z-index: 3; }
    .nc-message-list-menu-mask { position: absolute; top: 0; left: 0; z-index: 2; width: 100%; height: 100%; }
    .nc-chatui-msg-list-box { display: flex; align-items: center; width: 100%; min-width: 0; }
    .nc-chatui-msg-list-box-edit {
      box-sizing: border-box;
      width: calc(100% + 2 * var(--message-list-padding));
      margin: 0 calc(-1 * var(--message-list-padding)) var(--message-list-gap);
      padding: 20px var(--message-list-padding);
      background: #E8F0FE;
    }
    .nc-chatui-msg-list-spacer { flex: 0 0 auto; width: 100%; pointer-events: none; }
    .nc-chatui-time-section { width: 100%; }
    .nc-chatui-msg-list-box .checkbox { margin-right: 7px; align-self: flex-start; }
    .nc-chatui-msg-list-box .checkbox input[type="checkbox"] { display: none; }
    .nc-chatui-msg-list-box .checkbox .custom { display: flex; width: 16px; height: 16px; border: 1px solid #ABB8CB; border-radius: 50%; background-color: #FFFFFF; font-size: 0; justify-content: center; align-items: center; cursor: pointer; }
    .nc-chatui-msg-list-box .checkbox input[type="checkbox"]:checked + .custom { background-color: #16D258; border-color: #16D258; }
    .nc-chatui-select { position: absolute; top: 150px; left: 0px; width: 100%; box-sizing: border-box; z-index: 1; }
  `;
}
