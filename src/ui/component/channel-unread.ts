import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class ChannelUnreadElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
    }
    .unread-box {
      background-color: #FF5A50;
      font-size: 10px;
      color: #fff;
      border-radius: 12px;
      text-align: center;
    }
    .unread-box.muted {
      background-color: #E4E8EF;
      color: #41464F;
    }
    .message-count {
      display: block;
      line-height: 16px;
      min-width: 16px;
      height: 16px;
    }
    .message-count.overflow {
      padding: 0 5px;
    }
  `;

  @property({ type: Number })
  declare count: number;

  @property({ type: Number })
  declare notification: number;

  private displayCount(): string {
    if (this.count > 99) return '99+';
    return String(this.count);
  }

  render() {
    if (!this.count) return html``;

    return html`
      <div class="unread-box ${this.notification === 5 ? 'muted' : ''}">
        <span class="message-count ${this.count > 99 ? 'overflow' : ''}">
          ${this.count ? this.displayCount() : ''}
        </span>
      </div>
    `;
  }
}
