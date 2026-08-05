import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { formatTime } from '../../helper';
import { I18nController } from '../i18n/lit';
import { HOVER_MENU_ICON, HOVER_MENU_ACTIVE_ICON } from '../../assets';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

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
    .hover-menu-icon {
      visibility: hidden;
      cursor: pointer;
      width: 16px;
      height: 16px;
      margin: 0 8px;
      flex-shrink: 0;
    }
    .nc-message-bubble-root:hover .hover-menu-icon,
    .hover-menu-icon-active {
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

  @state() private declare isHovering: boolean;

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

  render() {
    if (!this.message) return html``;
    const time = this.message.sentTime ? this.timeController(this.message.sentTime) : '';
    const isAlignRight = !!this.align;
    const menuIconActive = this.menuActive || this.isItemHover;

    return html`
      <div class="nc-message-bubble-root ${isAlignRight ? 'nc-message-bubble-align-right' : ''}">
        <p class="name ${isAlignRight ? 'align' : ''}">
          ${this.showname ? html`<span class="nickname">${this.profile?.nickname || this.profile?.name}</span>` : ''}
          <span class="time">${time}</span>
        </p>
        <div class="message-content-wrapper">
          <div class="message-body-wrapper" style=${this.bubbleColorStyle ? `color:${this.bubbleColorStyle.color};background-color:${this.bubbleColorStyle.backgroundColor};border-radius:${this.bubbleColorStyle.borderRadius}` : ''}>
            <slot></slot>
          </div>
          ${!this.isH5 ? html`
            <div class="hover-menu-icon ${menuIconActive ? 'hover-menu-icon-active' : ''}"
              @click=${(e: MouseEvent) => this.handleMenuClick(e)}
              @mouseenter=${() => { this.isHovering = true; }}
              @mouseleave=${() => { this.isHovering = false; }}
            >
              <img width="16" height="16" src=${menuIconActive || this.isHovering ? HOVER_MENU_ACTIVE_ICON : HOVER_MENU_ICON} alt="HOVER_MENU_ICON">
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
