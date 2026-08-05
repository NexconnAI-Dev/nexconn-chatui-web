import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { ChannelType, SentStatus } from '@nexconn/chat';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import {
  SENT_STATUS_FAILED_ICON,
  SENT_STATUS_READ_ICON,
  SENT_STATUS_UNREAD_ICON,
  SENT_STATUS_SENDING_ICON,
  SENT_STATUS_UNREAD_CHAT_ICON,
  SENT_STATUS_SENDING_CHAT_ICON,
} from '../../assets';
import { I18nController } from '../i18n/lit';
import { ctx } from '../provider/context';

export class MessageSentStatusElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-chatui-message-sent-status {
      display: flex;
      align-items: center;
      font-size: 0;
      position: relative;
      margin-top: 4px;
    }
    .nc-chatui-read-receipt-pie {
      position: relative;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .nc-chatui-read-receipt-pie > svg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .nc-chatui-read-receipt-pie-fill {
      position: relative;
      z-index: 1;
      border-radius: 50%;
      box-sizing: border-box;
      transition: background 0.25s ease;
    }
    .nc-chatui-message-sent-status img {
      display: inline-block;
      vertical-align: middle;
    }
    .nc-chatui-message-sent-status img.nc-chatui-sending {
      animation: nc-chatui-rotate 1s linear infinite;
      transform-origin: center center;
      will-change: transform;
    }
    @keyframes nc-chatui-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .nc-chatui-read-receipt-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }
    .nc-chatui-has-tooltip:hover .nc-chatui-read-receipt-tooltip {
      opacity: 1;
      visibility: visible;
    }
    .nc-chatui-tooltip-content {
      background-color: #fff;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      line-height: 1.5;
    }
    .nc-chatui-tooltip-arrow {
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #fff;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  @property({ type: Number })
  declare type: number | undefined;

  private i18n = new I18nController(this);

  /**
   * Thin outer ring and solid inner pie chart, with spacing between them.
   * An inner radius of 5 and an outer ring at r=7 with stroke=1.2 leave about 1.4px of radial spacing.
   */
  private readonly size = 16;
  private readonly outerRadius = 7;
  private readonly outerStrokeWidth = 1.2;
  private readonly pieFillRadius = 5;
  private readonly pieFillDiameter = this.pieFillRadius * 2;
  private readonly pieGreen = '#46DB7A';

  private get context() { return ctx(); }

  private get isSupportReadReceiptVersion(): boolean {
    return this.context.isReadReceiptV5;
  }

  private get isV5Group(): boolean {
    return this.context.isReadReceiptV5 && this.message?.channelType === ChannelType.GROUP;
  }

  private get effectiveSentStatus(): SentStatus {
    if (!this.message) return SentStatus.SENT;
    let status: SentStatus = this.message.sentStatus ?? SentStatus.SENT;
    if (this.context.isReadReceiptV5) {
      if (this.message.channelType === ChannelType.DIRECT && this.message.readReceiptInfo) {
        const readCount = this.message.readReceiptInfo.readCount || 0;
        status = readCount > 0 ? SentStatus.READ : SentStatus.SENT;
      }
      if (this.message.channelType === ChannelType.GROUP && this.message.readReceiptInfo) {
        const { readCount = 0, unreadCount = 0 } = this.message.readReceiptInfo;
        if (readCount === 0) status = SentStatus.SENT;
        if (readCount === readCount + unreadCount) status = SentStatus.READ;
      }
    }
    return status;
  }

  private get showCursor(): boolean {
    return this.effectiveSentStatus === SentStatus.FAILED || this.isV5Group;
  }

  private get showPieChart(): boolean {
    if (!this.context.isReadReceiptV5) return false;
    if (this.message?.channelType !== ChannelType.GROUP) return false;
    if (this.message.sentStatus === SentStatus.SENDING || this.message.sentStatus === SentStatus.FAILED) return false;
    const receiptInfo = this.message.readReceiptInfo;
    if (!receiptInfo) return false;
    const readCount = receiptInfo.readCount || 0;
    const unreadCount = receiptInfo.unreadCount || 0;
    return readCount > 0 && unreadCount > 0;
  }

  private get readPercentage(): number {
    if (!this.showPieChart) return 0;
    const receiptInfo = this.message?.readReceiptInfo;
    if (!receiptInfo) return 0;
    const readCount = receiptInfo.readCount || 0;
    const unreadCount = receiptInfo.unreadCount || 0;
    // Match the "x read, y unread" text: ratio = read / (read + unread).
    // totalCount can include other counts, which would produce 25% instead of 33.3% here.
    const sum = readCount + unreadCount;
    if (sum === 0) return 0;
    return readCount / sum;
  }

  private get shouldShowTooltip(): boolean {
    if (!this.context.isReadReceiptV5) return false;
    if (this.message?.channelType !== ChannelType.GROUP) return false;
    if (this.message.sentStatus === SentStatus.SENDING || this.message.sentStatus === SentStatus.FAILED) return false;
    return true;
  }

  private get tooltipText(): string {
    if (!this.shouldShowTooltip) return '';
    const receiptInfo = this.message?.readReceiptInfo;
    const parts: string[] = [];
    if (!receiptInfo) {
      parts.push(this.i18n.t('message.list.read-receipt.tooltip.all-unread'));
      return parts.join(', ');
    }
    const readCount = receiptInfo.readCount || 0;
    const unreadCount = receiptInfo.unreadCount || 0;
    if (readCount === 0) {
      parts.push(this.i18n.t('message.list.read-receipt.tooltip.all-unread'));
    } else if (readCount === readCount + unreadCount) {
      parts.push(this.i18n.t('message.list.read-receipt.tooltip.all-read'));
    } else {
      parts.push(this.i18n.t('message.list.read-receipt.tooltip.read-count', readCount));
      parts.push(this.i18n.t('message.list.read-receipt.tooltip.unread-count', unreadCount));
    }
    return parts.join(', ');
  }

  private getStatusIcon(): string {
    switch (this.effectiveSentStatus) {
      case SentStatus.SENDING: return this.type ? SENT_STATUS_SENDING_ICON : SENT_STATUS_SENDING_CHAT_ICON;
      case SentStatus.FAILED: return SENT_STATUS_FAILED_ICON;
      case SentStatus.SENT: return this.type ? SENT_STATUS_UNREAD_ICON : SENT_STATUS_UNREAD_CHAT_ICON;
      case SentStatus.READ: return SENT_STATUS_READ_ICON;
      default: return SENT_STATUS_UNREAD_ICON;
    }
  }

  private handleClick(evt: MouseEvent) {
    evt.stopPropagation();
    if (this.effectiveSentStatus === SentStatus.FAILED || this.isV5Group) {
      this.dispatchEvent(new CustomEvent('sent-status-click', {
        bubbles: true,
        composed: true,
        detail: { message: this.message, evt },
      }));
    }
  }

  render() {
    if (!this.message || !this.isSupportReadReceiptVersion) return html``;
    const half = this.size / 2;
    const pct = Math.min(1, Math.max(0, this.readPercentage));
    const g = this.pieGreen;
    // 0deg is at 12 o'clock and angles increase clockwise; fill the read portion green and leave the unread remainder white.
    const pieFillBg =
      pct >= 1
        ? `conic-gradient(from 0deg, ${g} 0turn 1turn)`
        : `conic-gradient(from 0deg, ${g} 0turn ${pct}turn, #ffffff ${pct}turn 1turn)`;

    return html`
      <div
        class="nc-chatui-message-sent-status ${this.shouldShowTooltip ? 'nc-chatui-has-tooltip' : ''}"
        @click=${(e: MouseEvent) => this.handleClick(e)}
        style="cursor: ${this.showCursor ? 'pointer' : 'default'}"
      >
        ${this.showPieChart ? html`
          <div class="nc-chatui-read-receipt-pie">
            <svg width=${this.size} height=${this.size} viewBox="0 0 ${this.size} ${this.size}">
              <circle
                cx=${half}
                cy=${half}
                r=${this.outerRadius}
                fill="none"
                stroke=${this.pieGreen}
                stroke-width=${this.outerStrokeWidth}
              />
            </svg>
            <div
              class="nc-chatui-read-receipt-pie-fill"
              style="width:${this.pieFillDiameter}px;height:${this.pieFillDiameter}px;background:${pieFillBg};"
            ></div>
          </div>
        ` : html`
          <img
            src=${this.getStatusIcon()}
            class=${this.effectiveSentStatus === SentStatus.SENDING ? 'nc-chatui-sending' : ''}
            alt="status"
          >
        `}
        ${this.shouldShowTooltip && this.tooltipText ? html`
          <div class="nc-chatui-read-receipt-tooltip">
            <div class="nc-chatui-tooltip-content">${this.tooltipText}</div>
            <div class="nc-chatui-tooltip-arrow"></div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
