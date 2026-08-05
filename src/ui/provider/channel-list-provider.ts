import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import {
  ctx, channelList, openedChannel as opened,
  handleShowSentStatus, textarea, unreadCountBottom, getMessageDigest,
} from './context';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { I18nController } from '../i18n/lit';
import { SignalController } from '../SignalController';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { formatTime, isMobileDevice, trans2ChannelKey } from '../../helper';
import { LanguagePackEntries } from '../../languages';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import {
  ChannelsItemOrderChangeEvent, ChannelsItemDelteedEvent,
  ChannelListFirstScreenRenderingEvent, ChannelListItemChangeEvent,
  InnerEvent, ChatUIEvents,
} from '@lib/core/EventDefined';
import { NCChatUICode } from '@lib/enums/NCChatUICode';
import { ChannelType } from '@nexconn/chat';

export class ChannelListProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .nc-channel-wrap {
      padding: 0 10px;
      position: relative;
    }
    .nc-channel-list-menu {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 101;
      padding: 7px 4px;
      background-color: #fff;
      border-radius: 6px;
      box-shadow: 0px 4px 15.9px 0px #0000001C;
      min-width: 95px;
    }
    .nc-channel-list-menu-mask {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      width: 100%;
      height: 100%;
    }
  `;

  private i18n = new I18nController(this);
  private _signalController = new SignalController(this, [opened]);

  @state() private declare isH5: boolean;
  @state() private declare loading: boolean;
  @state() private declare rightClickedChannelKey: string | null;
  @state() private declare menuDisplay: 'block' | 'none';
  @state() private declare menuTop: number;
  @state() private declare menuLeft: number;
  @state() private declare menu: { id: string; icon: string; label: string; target: string }[];
  @state() private declare convList: ChatUIChannelModel[];

  private scrollbarEl: any = null;
  private menuRef: HTMLElement | null = null;
  private wrapRef: HTMLElement | null = null;

  private readonly weeklist: Array<keyof LanguagePackEntries> = [
    'time.format.sunday', 'time.format.monday', 'time.format.tueday',
    'time.format.wedday', 'time.format.thurday', 'time.format.friday', 'time.format.satday',
  ];

  connectedCallback() {
    super.connectedCallback();
    this.isH5 = isMobileDevice();
    this.loading = false;
    this.rightClickedChannelKey = null;
    this.menuDisplay = 'none';
    this.menuTop = 0;
    this.menuLeft = 0;
    this.menu = [];

    const context = ctx();
    this.convList = context.channelModule.getCachedChannelList();
    channelList.value = this.convList;

    window.addEventListener('resize', this.checkDevice);
    document.body.addEventListener('mouseup', this.handleHide, false);
    window.addEventListener('blur', this.handleHide, false);

    context.addEventListener(InnerEvent.CHANNELS_LIST_RESET, this.onChannelListInited);
    context.addEventListener(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, this.onChannelListItemOrderChange);
    context.addEventListener(InnerEvent.CHANNELS_ITEM_CHANGE, this.onChannelListItemChange);
    context.addEventListener(InnerEvent.CHANNELS_ITEM_DELETED, this.onChannelListItemRemove);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const context = ctx();
    window.removeEventListener('resize', this.checkDevice);
    document.body.removeEventListener('mouseup', this.handleHide, false);
    window.removeEventListener('blur', this.handleHide, false);

    context.removeEventListener(InnerEvent.CHANNELS_LIST_RESET, this.onChannelListInited);
    context.removeEventListener(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, this.onChannelListItemOrderChange);
    context.removeEventListener(InnerEvent.CHANNELS_ITEM_CHANGE, this.onChannelListItemChange);
    context.removeEventListener(InnerEvent.CHANNELS_ITEM_DELETED, this.onChannelListItemRemove);
  }

  protected updated() {
    // Keep scrolling state in sync with menu visibility.
    if (this.menuDisplay === 'block') {
      this.scrollbarEl?.disableScroll?.();
    } else {
      this.scrollbarEl?.enableScroll?.();
    }
    // Cache DOM references.
    this.menuRef = this.renderRoot?.querySelector('.nc-channel-list-menu') as HTMLElement;
    this.wrapRef = this.renderRoot?.querySelector('.nc-channel-wrap') as HTMLElement;
  }

  private checkDevice = () => {
    this.isH5 = isMobileDevice();
  };

  private onChannelListInited = async (e: ChannelListFirstScreenRenderingEvent) => {
    this.convList = [...e.data];
    channelList.value = this.convList;
    this.loading = this.convList.length >= 30;
    ctx().channelModule.updateLatesMessageStatus(this.convList);
  };

  private onChannelListItemOrderChange = (e: ChannelsItemOrderChangeEvent) => {
    const list = [...this.convList];
    e.data.forEach((item) => {
      const index = list.findIndex((c) => item.model.channelIdentifier.isEqualTo(c.channelIdentifier));
      if (index !== -1) {
        list.splice(index, 1);
      }
      list.splice(item.order, 0, item.model.clone());
      if (opened.value && item.model.channelIdentifier.isEqualTo(opened.value.channelIdentifier)) {
        unreadCountBottom.value = item.model.unreadCount;
      }
    });
    this.convList = list;
    channelList.value = list;
  };

  private onChannelListItemChange = (e: ChannelListItemChangeEvent) => {
    const list = [...this.convList];
    e.data.forEach((item) => {
      const index = list.findIndex((c) => item.channelIdentifier.isEqualTo(c.channelIdentifier));
      if (index !== -1) {
        list.splice(index, 1, item.clone());
      }
      if (opened.value && opened.value.channelIdentifier.isEqualTo(item.channelIdentifier)) {
        unreadCountBottom.value = item.unreadCount;
      }
    });
    this.convList = list;
    channelList.value = list;
  };

  private onChannelListItemRemove = (e: ChannelsItemDelteedEvent) => {
    const list = [...this.convList];
    e.data.forEach((item) => {
      const index = list.findIndex((c) => item.channelIdentifier.isEqualTo(c.channelIdentifier));
      if (index !== -1) list.splice(index, 1);
    });
    this.convList = list;
    channelList.value = list;
  };

  private handleTimeFilter(updateTime: number): string {
    const { year, month, day, hour, minute, weekDay } = formatTime(updateTime)!;
    const interval = (Date.now() - updateTime) / 1000 / 60 / 60 / 24;
    if (new Date().toDateString() === new Date(updateTime).toDateString()) {
      return `${hour}:${minute}`;
    }
    if ((new Date().toDateString() !== new Date(updateTime).toDateString() && interval < 1) || (1 <= interval && interval < 2)) {
      return this.i18n.t('time.format.yesterday');
    }
    if (2 <= interval && interval < 7) {
      return this.i18n.t(this.weeklist[weekDay] as keyof LanguagePackEntries);
    }
    return this.i18n.t('time.format.full', year, month, day);
  }

  private handleUserProfile(message: ChatUIMessageModel | null): string {
    const context = ctx();
    if (!message || message.senderUserId === context.userId) return '';
    if (message.channelType === ChannelType.SYSTEM) return context.appData.getSystemProfiles([message.channelIdentifier.channelId])[0].name;
    return context.appData.getUserProfile(message.senderUserId).name;
  }

  private isDraft(channelModel: ChatUIChannelModel): boolean {
    if (opened.value) {
      return !opened.value.channelIdentifier.isEqualTo(channelModel.channelIdentifier) && !!channelModel.draft;
    }
    return !!channelModel.draft;
  }

  private handleChannelRightClick = async (model: ChatUIChannelModel, e: MouseEvent) => {
    e.preventDefault();
    const context = ctx();
    const key = trans2ChannelKey(model.channelIdentifier);
    const list = context.channelsMenu.getMenum(model).map(item => ({
      id: item.id,
      icon: item.icon,
      label: this.i18n.t(item.id as keyof LanguagePackEntries),
      target: key,
    }));
    this.menu = list;
    this.rightClickedChannelKey = key;
    this.menuDisplay = 'block';

    await this.updateComplete;

    const menuEl = this.renderRoot?.querySelector('.nc-channel-list-menu') as HTMLElement;
    const scrollbarEl = this.renderRoot?.querySelector('nc-scrollbar-provider') as any;
    if (!menuEl || !scrollbarEl) return;

    const viewportRect = scrollbarEl.getViewportRect?.();
    const viewportSize = scrollbarEl.getViewportSize?.();
    const scrollPosition = scrollbarEl.getScrollPosition?.();
    if (!viewportRect || !viewportSize || !scrollPosition) return;

    const localX = e.clientX - viewportRect.left + scrollPosition.left;
    const localY = e.clientY - viewportRect.top + scrollPosition.top;

    this.menuTop = this.calculateTop(menuEl.clientHeight, localY, viewportSize.height, scrollPosition.top);
    this.menuLeft = this.calculateLeft(menuEl.clientWidth, localX, viewportSize.width, scrollPosition.left);
  };

  private handleChannelClick = async (item: ChatUIChannelModel, e: MouseEvent) => {
    e.preventDefault();
    this.menuDisplay = 'none';
    this.rightClickedChannelKey = null;
    const context = ctx();
    if (opened.value) {
      context.channelModule.handleChannelDraft(opened.value.channelIdentifier, textarea.value?.value);
    }
    if (item.channelType === ChannelType.SYSTEM) {
      const evt = new ChatUIEvent(ChatUIEvents.SYSTEM_CHANNEL_OPENING, item);
      context.emit(evt, 2);
      if (evt.isDefaultPrevented()) return;
    }
    const { code } = await context.channelModule.openChannel(item.channelIdentifier);
    if (code === NCChatUICode.CHANNEL_LIST_NOT_READY) {
      context.alert('alert.channel.list.not.ready');
    }
  };

  private handleMenuItemClick(menuId: string, key: string) {
    const context = ctx();
    const model = context.channelModule.getCachedChannelByKey(key);
    context.emit(new ChatUIEvent(ChatUIEvents.CHANNELS_MENU_ITEM_CLICK, { id: menuId, channelModel: model }));
    this.menuDisplay = 'none';
    this.rightClickedChannelKey = null;
  }

  private handleScrollLoading = async () => {
    if (!this.loading) return;
    const lastChannel = this.convList[this.convList.length - 1];
    const context = ctx();
    const { hasMore, code, list } = await context.channelModule.getMoreChannelList(lastChannel);
    if (code === 0) {
      this.convList = [...this.convList, ...list];
      channelList.value = this.convList;
      this.loading = hasMore;
    }
    context.channelModule.updateLatesMessageStatus([...list]);
  };

  private handleHide = (e: any) => {
    if (e.button !== 0) return;
    this.menuDisplay = 'none';
    this.rightClickedChannelKey = null;
  };

  private calculateTop(menuHeight: number, localY: number, containerHeight: number, scrollTop: number): number {
    const visibleY = localY - scrollTop;
    return containerHeight - visibleY < menuHeight ? localY - menuHeight : localY;
  }

  private calculateLeft(menuWidth: number, localX: number, containerWidth: number, scrollLeft: number): number {
    const visibleX = localX - scrollLeft;
    return containerWidth - visibleX < menuWidth ? localX - menuWidth : localX;
  }

  private onScrollbarConnected(e: Event) {
    this.scrollbarEl = e.target;
  }

  render() {
    const list = this.convList || [];
    const emptyDesc = this.i18n.t('channel.list.empty.desc');

    if (list.length === 0) {
      return html`<nc-channel-list-empty .desc=${emptyDesc}></nc-channel-list-empty>`;
    }

    return html`
      <nc-scrollbar-provider @loading=${this.handleScrollLoading} @connected=${this.onScrollbarConnected}
        ${(el: Element) => { this.scrollbarEl = el; }}>
        <div class="nc-channel-wrap">
          ${this.isH5 && this.menuDisplay === 'block' ? html`
            <div class="nc-channel-list-menu-mask" @click=${() => this.handleHide({ button: 0 })}></div>
          ` : nothing}
          <div class="nc-channel-list-menu" style="top: ${this.menuTop}px; left: ${this.menuLeft}px; display: ${this.menuDisplay};">
            ${this.menu.map(item => html`
              <nc-channel-list-menu-item
                .icon=${item.icon}
                .id=${item.id}
                .label=${item.label}
                @click=${() => this.handleMenuItemClick(item.id, item.target)}>
              </nc-channel-list-menu-item>
            `)}
          </div>

          <div class="nc-channel-list">
            ${list.map(item => html`
              <nc-channel-list-item
                .message=${getMessageDigest(item.latestMessage)}
                .time=${this.handleTimeFilter(item.updateTime)}
                .model=${item}
                .draft=${this.isDraft(item)}
                .statusEnable=${handleShowSentStatus(item.latestMessage)}
                .name=${this.handleUserProfile(item.latestMessage)}
                .selected=${opened.value ? opened.value.channelIdentifier.isEqualTo(item.channelIdentifier) : false}
                .rightClicked=${this.rightClickedChannelKey === trans2ChannelKey(item.channelIdentifier)}
                @contextmenu=${(e: MouseEvent) => { e.preventDefault(); this.handleChannelRightClick(item, e); }}
                @menu-click=${(e: CustomEvent) => this.handleChannelRightClick(item, e.detail[0])}
                @click=${(e: MouseEvent) => this.handleChannelClick(item, e)}>
              </nc-channel-list-item>
            `)}
            ${this.loading ? html`<nc-channel-loading></nc-channel-loading>` : nothing}
          </div>
        </div>
      </nc-scrollbar-provider>
    `;
  }
}
