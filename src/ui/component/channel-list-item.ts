import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ChatUIChannelModel } from '../../models/NCUIChannelModel';
import { ctx } from '../provider/context';
import { ChatUICommand } from '@lib/enums/ChatUICommand';
import { HOVER_MENU_ICON, HOVER_MENU_ACTIVE_ICON } from '../../assets';
import { I18nController } from '../i18n/lit';
import { ChannelNoDisturbLevel, ChannelType, SentStatus } from '@nexconn/chat';

export class ChannelListItemElement extends LitElement {
  static styles = css`
    :host { display: block; }
    .nc-message-sent-status {
      margin-right: 5px;
      margin-top: 2px;
    }
    .nc-channel-list-item {
      display: flex;
      height: 78px;
      align-items: center;
      padding: 0 14px 0 10px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 6px;
    }
    @media (max-width: 768px) {
      .nc-channel-list-item {
        user-select: none;
        -webkit-user-select: none;
      }
    }
    .nc-channel-list-item-avatar {
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
    }
    .nc-channel-list-item.active-top {
      background-color: var(--nc-item-top-bg);
    }
    .nc-channel-list-item.active-selected {
      background-color: var(--nc-item-selected-bg);
    }
    .nc-channel-list-item.active-right-clicked {
      background-color: #F1F1F1 !important;
    }
    .nc-channel-list-item:hover {
      background-color: var(--nc-item-hover-bg);
    }
    .nc-channel-list-item .channel-info {
      margin-left: 8px;
      flex: 1 1 auto;
      overflow: hidden;
      height: 44px;
    }
    .nc-channel-list-item .channel-info .info-block {
      font-size: 12px;
      display: flex;
    }
    .nc-latest-message {
      flex: 1;
      overflow: hidden;
      min-height: 18px;
      margin: 4px 15px 0 0;
    }
    .nc-icon {
      position: relative;
      font-size: 0px;
    }
    .nc-chat-ui-channel-group {
      color: #7C838E;
      line-height: 18px;
      margin-top: 4px;
    }
    .mentioned {
      color: #D45F5F;
      margin-right: 5px;
    }
    .nc-chat-ui-channel-draft {
      margin-top: 4px;
    }
    .nc-chat-ui-channel-draft .draft {
      color: #D45F5F;
      margin-right: 5px;
    }
    .nc-time-icon-container {
      display: flex;
      justify-content: flex-end;
      min-width: 16px;
      margin-left: auto;
    }
    .hover-menu-icon {
      display: none;
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
    @media (min-width: 769px) {
      .nc-channel-list-item:hover .hover-menu-icon,
      .nc-channel-list-item.active-right-clicked .hover-menu-icon {
        display: block;
      }
      .nc-channel-list-item:hover .nc-channel-time,
      .nc-channel-list-item.active-right-clicked .nc-channel-time {
        display: none;
      }
    }
  `;

  @property({ type: String }) declare message: string;
  @property({ type: String }) declare time: string;
  @property({ type: Object }) declare model: ChatUIChannelModel;
  @property({ type: Boolean }) declare statusEnable: boolean | null;
  @property({ type: String }) declare name: string;
  @property({ type: Boolean }) declare draft: boolean | null;
  @property({ type: Boolean }) declare selected: boolean | null;
  @property({ attribute: 'right-clicked', type: Boolean }) declare rightClicked: boolean | null;

  // Host templates may pass kebab-case properties, so proxy them to camelCase.
  set ['status-enable'](v: boolean | null) { this.statusEnable = v; }
  set ['right-clicked'](v: boolean | null) { this.rightClicked = v; }

  @state() private declare clickHoverMenu: boolean;

  private i18n = new I18nController(this);

  connectedCallback() {
    super.connectedCallback();
    this.clickHoverMenu = false;
  }

  private handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.clickHoverMenu = true;
    this.dispatchEvent(new CustomEvent('menu-click', { bubbles: true, composed: true, detail: [e] }));
  };

  private get hoverMenuActive(): boolean {
    return !!(this.rightClicked && this.clickHoverMenu);
  }

  private getItemStyle(): string {
    const context = ctx();
    const cfg = context.channelItem.channelsItemConfig;
    const parts: string[] = [];

    if (cfg.radius !== undefined) {
      parts.push(`border-radius: ${cfg.radius}px`);
    }

    const selectedBg = `#${Number(cfg.activeBackgroundColor).toString(16).padStart(6, '0')}`;
    const topBg = `#${Number(cfg.topBackgroundColor).toString(16).padStart(6, '0')}`;
    const hoverBg = this.selected
      ? selectedBg
      : `#${Number(cfg.hoverBackgroundColor).toString(16).padStart(6, '0')}`;

    parts.push(`--nc-item-selected-bg: ${selectedBg}`);
    parts.push(`--nc-item-top-bg: ${topBg}`);
    parts.push(`--nc-item-hover-bg: ${hoverBg}`);

    return parts.join('; ');
  }

  private get avatarSize(): number {
    const context = ctx();
    return context.channelItem.channelsItemConfig.portraitSize === 'small' ? 32 : 40;
  }

  private isShowSentStatusIcon(): boolean {
    if (!this.statusEnable || !this.model?.latestMessage) return false;
    if (this.draft) return false;

    const context = ctx();
    const sentStatus = this.model.latestMessage.sentStatus;
    const isSent = sentStatus === SentStatus.FAILED || sentStatus === SentStatus.SENDING;

    const isNotGroupReadV5 = (() => {
      if (
        context.store.getCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE) &&
        context.isReadReceiptV5 &&
        !isSent
      ) {
        return this.model.channelType !== ChannelType.GROUP;
      }
      return true;
    })();

    if (!isNotGroupReadV5) return false;

    if (isSent) return true;
    return !this.model.unreadCount;
  }

  render() {
    if (!this.model) return html``;
    const isGroup = this.model.channelType === ChannelType.GROUP;
    const showSentStatus = this.isShowSentStatusIcon();
    const itemStyle = this.getItemStyle();
    const avatarSize = this.avatarSize;

    const classes = [
      'nc-channel-list-item',
      this.model.isPinned ? 'active-top' : '',
      this.selected ? 'active-selected' : '',
      this.rightClicked ? 'active-right-clicked' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${classes} style=${itemStyle}>
        <div class="nc-channel-list-item-avatar">
          <nc-icon
            class="nc-icon"
            width=${avatarSize}
            height=${avatarSize}
            radius="50"
            .url=${this.model.avatarUrl}
            .online=${this.model.online}>
          </nc-icon>
        </div>
        <div class="channel-info">
          <div class="info-block" style="align-items: center;">
            <div style="max-width: 50%;">
              <nc-channel-label .name=${this.model.name}></nc-channel-label>
            </div>
            ${this.model.isPinned ? html`<nc-channel-pinned-icon></nc-channel-pinned-icon>` : ''}
            ${
              this.model.noDisturbLevel === ChannelNoDisturbLevel.MUTED
                ? html`<nc-channel-muted-icon></nc-channel-muted-icon>`
                : ''
            }
            <div class="nc-time-icon-container">
              <nc-channel-time class="nc-channel-time" .time=${this.time}></nc-channel-time>
              <div class="hover-menu-icon" @click=${this.handleMenuClick}>
                <img width="16" height="16"
                  .src=${this.hoverMenuActive ? HOVER_MENU_ACTIVE_ICON : HOVER_MENU_ICON}
                  alt="HOVER_MENU_ICON">
              </div>
            </div>
          </div>
          <div class="info-block">
            ${this.draft ? html`
              <div class="nc-chat-ui-channel-draft">
                <span class="draft">${this.i18n.t('channel.draft.msg')}</span>
              </div>
            ` : ''}
            ${isGroup && !this.draft ? html`
              <div class="nc-chat-ui-channel-group">
                ${this.model.mentionedType ? html`<span class="mentioned">${this.i18n.t('channel.mentioned.me.msg')}</span>` : ''}
                ${this.name ? html`<span>${this.name}: </span>` : ''}
              </div>
            ` : ''}
            ${showSentStatus ? html`
              <nc-message-sent-status
                class="nc-message-sent-status"
                type="1"
                .message=${this.model.latestMessage}>
              </nc-message-sent-status>
            ` : ''}
            ${(this.message || this.model.draft) ? html`
              <nc-latest-message
                class="nc-latest-message"
                .message=${this.draft ? this.model.draft : this.message}
                .mentioned=${this.model.mentionedType}>
              </nc-latest-message>
            ` : ''}
            ${!showSentStatus ? html`
              <nc-channel-unread
                .count=${this.model.unreadCount}
                .notification=${this.model.noDisturbLevel}>
              </nc-channel-unread>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}
