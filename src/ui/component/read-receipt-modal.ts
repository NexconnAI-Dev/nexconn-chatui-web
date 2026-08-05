import { LitElement, html, css, nothing } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { ctx } from '../provider/context';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { I18nController } from '../i18n/lit';
import { formatTime } from '../../helper';

export class ReadReceiptModalElement extends LitElement {
  static styles = css`
    :host { display: block; }
    .read-receipt-popover {
      position: absolute;
      background-color: #fff;
      border-radius: 6px;
      box-shadow: 0px 5px 16px 0px #00000014;
      width: 344px;
      z-index: 4;
    }
    .read-receipt-content {
      display: flex;
      flex-direction: row;
      max-height: 420px;
    }
    .read-receipt-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #E5E5E5;
    }
    .read-receipt-column:last-child {
      border-right: none;
    }
    .read-receipt-title {
      padding: 15px 12px 6px 12px;
      font-size: 14px;
      color: #0E1012;
    }
    .read-receipt-list-wrapper {
      flex: 1;
      position: relative;
      max-height: 380px;
      overflow: hidden;
    }
    .read-receipt-list {
      height: 100%;
      overflow-y: scroll;
      padding: 0;
      scrollbar-width: none;
      padding-bottom: 10px;
    }
    .read-receipt-list::-webkit-scrollbar {
      display: none;
    }
    .read-receipt-ul {
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .read-receipt-item {
      display: flex;
      align-items: center;
      padding: 4px 12px;
    }
    .read-receipt-item:last-child {
      border-bottom: none;
    }
    .read-receipt-info {
      margin-left: 4px;
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .read-receipt-name {
      font-size: 12px;
      color: #0E1012;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .read-receipt-time {
      color: #85909C;
      font-size: 11px;
      margin: 0;
      flex-shrink: 0;
    }
    .read-receipt-time img {
      width: 12px;
      height: 12px;
    }
  `;

  private i18n = new I18nController(this);

  @property({ type: Object }) declare message: ChatUIMessageModel | null;
  @property({ type: Boolean }) declare visible: boolean;
  @property({ type: Array }) declare readUsers: any[];
  @property({ type: Array }) declare unreadUsers: any[];
  @property({ type: Boolean }) declare readLoading: boolean;
  @property({ type: Boolean }) declare unreadLoading: boolean;
  @property({ type: Object }) declare position: { top: number; left: number; anchor?: string } | undefined;

  @query('.read-receipt-list.read') private declare readListEl: HTMLDivElement;
  @query('.read-receipt-list.unread') private declare unreadListEl: HTMLDivElement;

  @state() private declare readSizeHeight: number;
  @state() private declare readMoveY: number;
  @state() private declare readRatioY: number;
  @state() private declare unreadSizeHeight: number;
  @state() private declare unreadMoveY: number;
  @state() private declare unreadRatioY: number;

  private get readCount(): number {
    return this.readUsers.length;
  }

  private get unreadCount(): number {
    return this.unreadUsers.length;
  }

  private readResizeObserver: ResizeObserver | null = null;
  private unreadResizeObserver: ResizeObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('click', this.handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('click', this.handleClickOutside);
    this.cleanupResizeObservers();
  }

  protected updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('visible') || changedProps.has('readUsers') || changedProps.has('unreadUsers')) {
      if (this.visible) {
        // Initialize after the DOM update completes.
        this.updateComplete.then(() => {
          this.initResizeObservers();
          this.updateReadScrollbar();
          this.updateUnreadScrollbar();
        });
      } else {
        this.cleanupResizeObservers();
      }
    }
  }

  private handleResize = () => {
    this.updateReadScrollbar();
    this.updateUnreadScrollbar();
  };

  private handleClickOutside = (e: MouseEvent) => {
    if (!this.visible) return;
    const target = e.target as HTMLElement;
    const popover = target.closest('.read-receipt-popover');
    if (!popover) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  };

  private updateReadScrollbar() {
    const el = this.renderRoot?.querySelector('.read-receipt-list.read') as HTMLDivElement;
    if (!el) return;
    const original = el.offsetHeight ** 2 / el.scrollHeight;
    const originalHeight = Math.floor(original * 100) / 100;
    const height = Math.max(originalHeight, 20);
    const ratio = originalHeight / (el.offsetHeight - originalHeight) / (height / (el.offsetHeight - height));
    this.readRatioY = Math.floor(ratio * 100) / 100 || 1;
    this.readSizeHeight = originalHeight < el.offsetHeight ? Math.floor(height) : 0;
  }

  private updateUnreadScrollbar() {
    const el = this.renderRoot?.querySelector('.read-receipt-list.unread') as HTMLDivElement;
    if (!el) return;
    const original = el.offsetHeight ** 2 / el.scrollHeight;
    const originalHeight = Math.floor(original * 100) / 100;
    const height = Math.max(originalHeight, 20);
    const ratio = originalHeight / (el.offsetHeight - originalHeight) / (height / (el.offsetHeight - height));
    this.unreadRatioY = Math.floor(ratio * 100) / 100 || 1;
    this.unreadSizeHeight = originalHeight < el.offsetHeight ? Math.floor(height) : 0;
  }

  private initResizeObservers() {
    const readEl = this.renderRoot?.querySelector('.read-receipt-list.read') as HTMLDivElement;
    const unreadEl = this.renderRoot?.querySelector('.read-receipt-list.unread') as HTMLDivElement;

    if (readEl && !this.readResizeObserver) {
      this.readResizeObserver = new ResizeObserver(() => this.updateReadScrollbar());
      this.readResizeObserver.observe(readEl);
    }
    if (unreadEl && !this.unreadResizeObserver) {
      this.unreadResizeObserver = new ResizeObserver(() => this.updateUnreadScrollbar());
      this.unreadResizeObserver.observe(unreadEl);
    }
  }

  private cleanupResizeObservers() {
    this.readResizeObserver?.disconnect();
    this.readResizeObserver = null;
    this.unreadResizeObserver?.disconnect();
    this.unreadResizeObserver = null;
  }

  private handleReadMove(e: CustomEvent) {
    const el = this.renderRoot?.querySelector('.read-receipt-list.read') as HTMLDivElement;
    if (!el) return;
    el.scrollTop = (e.detail[0] * el.scrollHeight) / 100;
  }

  private handleUnreadMove(e: CustomEvent) {
    const el = this.renderRoot?.querySelector('.read-receipt-list.unread') as HTMLDivElement;
    if (!el) return;
    el.scrollTop = (e.detail[0] * el.scrollHeight) / 100;
  }

  private handleScroll(e: Event, type: 'read' | 'unread') {
    if (!e?.target) return;
    const target = e.target as HTMLDivElement;
    const { scrollHeight, offsetHeight, scrollTop } = target;

    if (type === 'read') {
      this.readMoveY = ((scrollTop * 100) / offsetHeight) * this.readRatioY || 0;
    } else {
      this.unreadMoveY = ((scrollTop * 100) / offsetHeight) * this.unreadRatioY || 0;
    }

    this.dispatchEvent(new CustomEvent('read-status-scroll', {
      bubbles: true,
      composed: true,
      detail: [{ scrollTop, scrollHeight, clientHeight: offsetHeight }, type],
    }));
  }

  private getPopoverStyle(): string {
    if (!this.position) return '';
    const anchor = this.position.anchor || 'top-right';
    const transforms: Record<string, string> = {
      'top-right': 'translateX(-100%)',
      'bottom-right': 'translate(-100%, -100%)',
      'top-left': '',
      'top-center': 'translateX(-50%)',
      'bottom-center': 'translate(-50%, -100%)',
      'bottom-left': 'translateY(-100%)',
    };
    const transform = transforms[anchor] ?? '';
    return `top: ${this.position.top}px; left: ${this.position.left}px;${transform ? ` transform: ${transform};` : ''}`;
  }

  private truncateName(name: string, maxLength = 10): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  private timeController(time: number): string {
    const { hour, minute } = formatTime(time)!;
    return `${hour}:${minute}`;
  }

  render() {
    if (!this.visible) return nothing;
    const context = ctx();
    const readScrollHeight = this.renderRoot?.querySelector('.read-receipt-list.read')?.scrollHeight;
    const unreadScrollHeight = this.renderRoot?.querySelector('.read-receipt-list.unread')?.scrollHeight;

    return html`
      <div class="read-receipt-popover" style=${this.getPopoverStyle()} @click=${(e: MouseEvent) => e.stopPropagation()}>
        <div class="read-receipt-content">
          <!-- Read list -->
          <div class="read-receipt-column">
            <div class="read-receipt-title">${this.i18n.t('message.list.read-receipt.tooltip.read-count', this.readCount)}</div>
            <div class="read-receipt-list-wrapper">
              <div class="read-receipt-list read" @scroll=${(e: Event) => this.handleScroll(e, 'read')}>
                <ul class="read-receipt-ul">
                  ${(this.readUsers || []).map(user => {
                    const profile = context.appData.getUserProfile(user.userId);
                    return html`
                      <li class="read-receipt-item">
                        <nc-icon .url=${profile.avatarUrl} radius="50" width="20" height="20" .online=${false}></nc-icon>
                        <div class="read-receipt-info">
                          <p class="read-receipt-name">${this.truncateName(profile.name)}</p>
                          ${user.timestamp ? html`<p class="read-receipt-time">${this.timeController(user.timestamp)}</p>` : nothing}
                        </div>
                      </li>
                    `;
                  })}
                </ul>
              </div>
              ${this.readSizeHeight ? html`
                <nc-scrollbar-thumb-provider
                  .height=${this.readSizeHeight}
                  .move=${this.readMoveY}
                  .scrollheight=${readScrollHeight}
                  .ratio=${this.readRatioY}
                  @handlemove=${(e: CustomEvent) => this.handleReadMove(e)}>
                </nc-scrollbar-thumb-provider>
              ` : nothing}
            </div>
          </div>
          <!-- Unread list -->
          <div class="read-receipt-column">
            <div class="read-receipt-title">${this.i18n.t('message.list.read-receipt.tooltip.unread-count', this.unreadCount)}</div>
            <div class="read-receipt-list-wrapper">
              <div class="read-receipt-list unread" @scroll=${(e: Event) => this.handleScroll(e, 'unread')}>
                <ul class="read-receipt-ul">
                  ${(this.unreadUsers || []).map(user => {
                    const profile = context.appData.getUserProfile(user.userId);
                    return html`
                      <li class="read-receipt-item">
                        <nc-icon .url=${profile.avatarUrl} radius="50" width="20" height="20" .online=${false}></nc-icon>
                        <div class="read-receipt-info">
                          <p class="read-receipt-name">${this.truncateName(profile.name)}</p>
                        </div>
                      </li>
                    `;
                  })}
                </ul>
              </div>
              ${this.unreadSizeHeight ? html`
                <nc-scrollbar-thumb-provider
                  .height=${this.unreadSizeHeight}
                  .move=${this.unreadMoveY}
                  .scrollheight=${unreadScrollHeight}
                  .ratio=${this.unreadRatioY}
                  @handlemove=${(e: CustomEvent) => this.handleUnreadMove(e)}>
                </nc-scrollbar-thumb-provider>
              ` : nothing}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
