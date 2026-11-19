import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { formatTime } from '../../helper';
import { I18nController } from '../i18n/lit';
import {
  HOVER_MENU_ICON, HOVER_MENU_ACTIVE_ICON,
  HOVER_REACTION_ICON, HOVER_REACTION_ACTIVE_ICON,
} from '../../assets';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { SentStatus } from '@nexconn/chat';
import {
  MessageBubbleContentLayout,
  shouldInsetMessageBubbleContent,
} from '../message-bubble-layout';

const WEEK_DAYS = [
  'time.format.sunday',
  'time.format.monday',
  'time.format.tueday',
  'time.format.wedday',
  'time.format.thurday',
  'time.format.friday',
  'time.format.satday',
] as const;

export class MessageBubbleElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-message-bubble-root {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 100%;
    }
    .nc-message-bubble-align-right {
      align-items: flex-end;
    }
    p {
      margin: 0 0 5px 0;
      line-height: 16px;
      padding: 0;
      word-break: break-word;
    }
    .message-body-wrapper {
      font-size: 14px;
      min-width: 0;
      max-width: 100%;
      flex: 1 1 auto;
    }
    .message-content-region {
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .message-content-region-inset {
      padding: 20px;
    }
    .message-content-region-inset.message-content-region-with-reactions {
      padding-bottom: 0;
    }
    .message-reactions-region {
      margin-top: 12px;
      padding: 0 20px 20px;
    }
    .name {
      font-size: 12px;
      color: #41464F;
      max-width: 100%;
    }
    .nickname {
      margin-right: 8px;
    }
    .align {
      text-align: right;
    }
    .time {
      display: inline-block;
      font-weight: normal;
      color: #7C838E;
    }
    .message-content-wrapper {
      display: flex;
      align-items: flex-start;
      max-width: 100%;
    }
    .nc-message-bubble-align-right .message-content-wrapper {
      flex-direction: row-reverse;
    }
    .message-actions-wrapper {
      display: flex;
      flex-direction: column;
      align-self: stretch;
      justify-content: flex-start;
      align-items: flex-start;
      flex-shrink: 0;
      margin: 0 4px;
    }
    .nc-message-bubble-align-right .message-actions-wrapper {
      align-items: flex-end;
    }
    .hover-menu-icons {
      visibility: hidden;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      margin: 0;
    }
    .hover-menu-icons img {
      width: 20px;
      height: 20px;
    }
    .nc-chatui-msg-sent-status {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: auto;
    }
    .nc-message-bubble-root:hover .hover-menu-icons,
    .hover-menu-icons-active {
      visibility: visible;
    }
  `;

  @property({ type: Boolean })
  declare showname: boolean | null;

  @property({ type: Boolean })
  declare align: boolean | null;

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  @property({ type: Object })
  declare profile: { name: string; nickname?: string; userId: string; portraitUri: string };

  @property({ type: Object })
  declare bubbleColorStyle: { color: string; backgroundColor: string; borderRadius: string };

  @property({ type: String })
  declare contentLayout: MessageBubbleContentLayout | undefined;

  // Host templates may pass kebab-case properties, so proxy them to camelCase.
  set ['bubble-color-style'](v: { color: string; backgroundColor: string; borderRadius: string }) { this.bubbleColorStyle = v; }

  @property({ type: Boolean })
  declare menuActive: boolean | undefined;

  set ['menu-active'](v: boolean) { this.menuActive = v; }

  @property({ type: Boolean })
  declare isH5: boolean | undefined;

  set ['is-h5'](v: boolean) { this.isH5 = v; }

  @property({ type: Boolean })
  declare isItemHover: boolean | undefined;

  set ['is-item-hover'](v: boolean) { this.isItemHover = v; }

  @property({ type: Boolean })
  declare reactionEnabled: boolean | undefined;

  set ['reaction-enabled'](v: boolean) { this.reactionEnabled = v; }

  @property({ type: Boolean })
  declare reactionBoardActive: boolean | undefined;

  set ['reaction-board-active'](v: boolean) { this.reactionBoardActive = v; }

  @property({ type: Boolean })
  declare showSentStatus: boolean | undefined;

  set ['show-sent-status'](v: boolean) { this.showSentStatus = v; }

  @state() private declare isHovering: boolean;
  @state() private declare isHoveringReaction: boolean;

  private i18n = new I18nController(this);

  private timeController(time: number): string {
    const { year, month, day, hour, minute, weekDay } = formatTime(time)!;
    const now = new Date();
    const msgDate = new Date(time);

    const isToday = now.toDateString() === msgDate.toDateString();
    if (isToday) {
      return `${hour}:${minute}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === msgDate.toDateString();

    if (isYesterday) {
      return `${this.i18n.t('time.format.yesterday')} ${hour}:${minute}`;
    }

    const isThisYear = now.getFullYear() === msgDate.getFullYear();
    if (isThisYear) {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (msgDate > oneWeekAgo) {
        return `${this.i18n.t(WEEK_DAYS[weekDay])} ${hour}:${minute}`;
      }
      return `${month}/${day} ${hour}:${minute}`;
    }

    return `${year}/${month}/${day}`;
  }

  private handleMenuClick(e: MouseEvent) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('menu-click', { bubbles: true, composed: true, detail: [e] }));
  }

  private handleReactionClick(e: MouseEvent) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('reaction-click', { bubbles: true, composed: true, detail: [e] }));
  }

  render() {
    if (!this.message) return html``;
    const time = this.message.sentTime ? this.timeController(this.message.sentTime) : '';
    const isAlignRight = !!this.align;
    const actionIconsActive = this.menuActive || this.reactionBoardActive || this.isItemHover;
    const hasReactions = !!this.reactionEnabled && this.message.reactions.length > 0;
    const hasContentInset = shouldInsetMessageBubbleContent(this.contentLayout, false, hasReactions);

    return html`
      <div class="nc-message-bubble-root ${isAlignRight ? 'nc-message-bubble-align-right' : ''}">
        <p class="name ${isAlignRight ? 'align' : ''}">
          ${this.showname ? html`<span class="nickname">${this.profile?.nickname || this.profile?.name}</span>` : ''}
          <span class="time">${time}</span>
        </p>
        <div class="message-content-wrapper">
          <div class="message-body-wrapper" style=${this.bubbleColorStyle ? `color:${this.bubbleColorStyle.color};background-color:${this.bubbleColorStyle.backgroundColor};border-radius:${this.bubbleColorStyle.borderRadius}` : ''}>
            <div class="message-content-region ${hasContentInset ? 'message-content-region-inset' : ''} ${hasReactions ? 'message-content-region-with-reactions' : ''}">
              <slot></slot>
            </div>
            ${hasReactions ? html`
              <div class="message-reactions-region">
                <nc-message-reactions-provider
                  .reactions=${this.message.reactions}
                  .message=${this.message}
                  .align=${this.align}
                ></nc-message-reactions-provider>
              </div>
            ` : ''}
          </div>
          <div class="message-actions-wrapper">
            ${!this.isH5 ? html`
              <div class="hover-menu-icons ${actionIconsActive ? 'hover-menu-icons-active' : ''}">
                <img
                  src=${this.menuActive || this.isHovering ? HOVER_MENU_ACTIVE_ICON : HOVER_MENU_ICON}
                  alt="Menu"
                  @click=${(e: MouseEvent) => this.handleMenuClick(e)}
                  @mouseenter=${() => { this.isHovering = true; }}
                  @mouseleave=${() => { this.isHovering = false; }}
                >
                ${this.reactionEnabled && this.message.sentStatus === SentStatus.SENT ? html`
                  <img
                    src=${this.reactionBoardActive || this.isHoveringReaction ? HOVER_REACTION_ACTIVE_ICON : HOVER_REACTION_ICON}
                    alt="Reaction"
                    @click=${(e: MouseEvent) => this.handleReactionClick(e)}
                    @mouseenter=${() => { this.isHoveringReaction = true; }}
                    @mouseleave=${() => { this.isHoveringReaction = false; }}
                  >
                  ` : ''}
              </div>
            ` : ''}
            ${this.showSentStatus ? html`
              <nc-message-sent-status
                class="nc-chatui-msg-sent-status"
                .type=${0}
                .message=${this.message}
              ></nc-message-sent-status>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}
