import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ChatUIChannelModel } from '../../models/NCUIChannelModel';
import { GROUP_MEMBERS_ICON } from '../../assets';
import { ctx, openedChannel, textarea } from './context';
import { ChannelPanelExtension } from '../../modules/ChatUIStore';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { isMobileDevice } from '../../helper';
import { I18nController } from '../i18n/lit';
import { ChannelSelectedEvent, ChatUIEvents, RecvNewMessagesEvent, InnerEvent } from '@lib/core/EventDefined';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import {
  ChannelHandler, NCEngine, TypingStatusChangedEvent, ChannelType, MessageType
} from '@nexconn/chat';

export class ChannelDetailBarProvider extends LitElement {
  static styles = css`
    :host { display: block; }
    .nc-channel-detail-bar {
      width: 100%;
      height: 70px;
      display: flex;
      flex-direction: row;
      align-items: center;
      border-bottom: 1px dashed #E4E7ED;
      position: relative;
      z-index: 2;
      background-color: #fff;
    }
    .info {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex: auto;
    }
    .icon {
      width: 32px;
      height: 32px;
      margin: 0 10px 0 20px;
      cursor: pointer;
    }
    .name {
      font-size: 16px;
      color: #020814;
      font-weight: 500;
    }
    .member-icon {
      margin: 0 4px 0 20px;
      width: 12px;
      height: 12px;
    }
    .member-count {
      font-size: 12px;
      color: #bcbcbc;
    }
    .extension {
      margin: 0 28px 0 10px;
    }
    .extension-icon {
      width: 26px;
      height: 26px;
      margin-right: 10px;
      cursor: pointer;
    }
    .typing-content {
      margin-left: 5px;
      font-size: 12px;
      color: #7C838E;
    }
    .back-button {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-left: 5px;
      font-weight: 500;
      color: #000;
      cursor: pointer;
    }
  `;

  @property({ type: Object }) declare model: ChatUIChannelModel;
  @property({ type: Boolean }) declare showBack: boolean;

  @state() private declare isH5: boolean;
  @state() private declare showTypingStatus: boolean;
  @state() private declare typingContent: string;

  private i18n = new I18nController(this);
  private context = ctx();
  private typingTimer: any = null;

  private checkDevice = () => {
    this.isH5 = isMobileDevice();
  };

  private handleBack = () => {
    if (openedChannel.value) {
      this.context.channelModule.handleChannelDraft(openedChannel.value.channelIdentifier, textarea.value?.value);
    }
    this.context.channelModule.setOpenedChannel(null, false);
  };

  private handleExtension = (item: ChannelPanelExtension) => {
    this.context.emit(new ChatUIEvent(ChatUIEvents.CHANNEL_PANEL_EXTENSION_TOUCH, {
      id: item.id,
      channelModel: this.model
    }));
  };

  private handleChannelNaviClick = () => {
    this.context.emit(new ChatUIEvent(ChatUIEvents.CHANNEL_NAVI_CLICK, this.model.clone()), 2);
  };

  private _onTypingStatus = (evt: TypingStatusChangedEvent) => {
    const { channelIdentifier, userTypingStatus } = evt;
    if (!openedChannel.value || !openedChannel.value.channelIdentifier.isEqualTo(channelIdentifier)) return;

    const list = userTypingStatus;
    if (list.length === 0) return;

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
      this.showTypingStatus = false;
      this.typingContent = '';
    }

    const isTextTyping = list.some((item) => item.typingMessageType === MessageType.TEXT);
    this.typingContent = isTextTyping
      ? this.i18n.t('channel.detail.bar.typing')
      : this.i18n.t('channel.detail.bar.typing.audio');
    this.showTypingStatus = true;
    this.typingTimer = setTimeout(() => {
      this.showTypingStatus = false;
      this.typingContent = '';
    }, 5000);
  };

  private _onChannelSelected = (env: ChannelSelectedEvent) => {
    this.showTypingStatus = false;
  };

  private _onRecvNewMessages = (evt: RecvNewMessagesEvent) => {
    if (!openedChannel.value || this.model.channelType === ChannelType.GROUP) return;

    const messages: ChatUIMessageModel[] = evt.data;
    const currentUserId = this.context.userId;

    const hasMessageFromOther = messages.some((msg) => {
      return openedChannel.value!.channelIdentifier.isEqualTo(msg.channelIdentifier) && msg.senderUserId !== currentUserId;
    });

    if (hasMessageFromOther) {
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }
      this.showTypingStatus = false;
      this.typingContent = '';
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.checkDevice();
    window.addEventListener('resize', this.checkDevice);
    NCEngine.addChannelHandler('channel-detail-bar-provider', new ChannelHandler({
      onTypingStatusChanged: this._onTypingStatus,
    }));
    ctx().addEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onChannelSelected);
    ctx().addEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.checkDevice);
    NCEngine.removeChannelHandler('channel-detail-bar-provider');
    ctx().removeEventListener(ChatUIEvents.CHANNEL_SELECTED, this._onChannelSelected);
    ctx().removeEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages);
  }

  render() {
    const isGroup = this.model.channelType === ChannelType.GROUP;
    const extension = this.context.store.getChannelPanelExtension();
    const list = extension.filter((item) => !item.filter || item.filter(this.model));

    return html`
      <div class="nc-channel-detail-bar ${this.isH5 ? 'is-h5' : ''}">
        ${this.isH5 && this.showBack ? html`
          <div class="back-button" @click=${this.handleBack}>
            <span class="back-icon">&lt;</span>
          </div>
        ` : ''}
        <div class="info">
          <img @click=${this.handleChannelNaviClick} class="icon" .src=${this.model.avatarUrl} alt="">
          <span class="name">${this.model.name}</span>
          ${this.model.noDisturbLevel === 5 ? html`<nc-channel-muted-icon></nc-channel-muted-icon>` : ''}
          ${isGroup ? html`
            <img class="member-icon" .src=${GROUP_MEMBERS_ICON} alt="Group Members Icon">
            <span class="member-count">${this.model.memberCount}</span>
          ` : ''}
          ${this.showTypingStatus && !isGroup ? html`<span class="typing-content">${this.typingContent}</span>` : ''}
        </div>
        <div class="extension">
          ${list.map(item => html`
            <img class="extension-icon" .src=${item.icon} .key=${item.id} alt="Extension Icon" @click=${() => this.handleExtension(item)}>
          `)}
        </div>
      </div>
    `;
  }
}
