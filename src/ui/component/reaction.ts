import { LitElement, css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ChatUIMessageReaction } from '@lib/models/NCUIMessageModel';
import { I18nController } from '../i18n/lit';

export class ReactionElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      min-width: 0;
      max-width: 100%;
    }

    .nc-reaction {
      display: inline-flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      padding: 2px 8px;
      overflow: hidden;
      color: #565960;
      font-size: 10px;
      line-height: 20px;
      background-color: #F0F0F0;
      border: 1px solid transparent;
      border-radius: 20px;
      box-sizing: border-box;
      cursor: pointer;
      user-select: none;
    }

    .nc-reaction-active {
      background-color: #BED4FF;
      border-color: #0047FFCC;
    }

    button {
      padding: 0;
      color: inherit;
      font: inherit;
      line-height: inherit;
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .nc-reaction-emoji {
      flex-shrink: 0;
      padding-right: 6px;
      margin-right: 6px;
      font-size: 14px;
      line-height: 14px;
      border-right: 1px solid #A6A6A6;
    }

    .nc-reaction-count {
      color: #565960;
      font-size: 12px;
    }

    .nc-reaction-count:hover,
    .nc-reaction-users-count:hover {
      color: #0047FF;
    }

    .nc-reaction-users {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      min-width: 0;
      overflow: hidden;
    }

    .nc-reaction-users-text {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nc-reaction-users-count {
      flex-shrink: 0;
      margin-left: 2px;
      white-space: nowrap;
    }
  `;

  @property({ type: Object })
  declare reaction: ChatUIMessageReaction;

  @property({ type: Boolean })
  declare showUsers: boolean;

  set ['show-users'](value: boolean) { this.showUsers = value; }

  @property({ type: Array })
  declare names: string[] | undefined;

  @property({ type: Boolean })
  declare align: boolean | undefined;

  @query('.nc-reaction-users')
  private declare usersEl: HTMLElement | undefined;

  @query('.nc-reaction-users-text')
  private declare usersTextEl: HTMLElement | undefined;

  @state()
  private declare isOverflow: boolean;

  private i18n = new I18nController(this);
  private resizeObserver: ResizeObserver | null = null;
  private overflowFrame = 0;

  connectedCallback() {
    super.connectedCallback();
    this.isOverflow = false;
  }

  disconnectedCallback() {
    this.stopObserver();
    super.disconnectedCallback();
  }

  protected updated() {
    if (this.showUsers && this.names?.length && this.usersEl && this.usersTextEl) {
      if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.scheduleOverflowCheck());
        this.resizeObserver.observe(this.usersEl);
        this.resizeObserver.observe(this.usersTextEl);
      }
      this.scheduleOverflowCheck();
      return;
    }
    this.stopObserver();
  }

  private stopObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.overflowFrame) {
      cancelAnimationFrame(this.overflowFrame);
      this.overflowFrame = 0;
    }
    if (this.isOverflow) {
      this.isOverflow = false;
    }
  }

  private scheduleOverflowCheck() {
    if (this.overflowFrame) return;
    this.overflowFrame = requestAnimationFrame(() => {
      this.overflowFrame = 0;
      const nextValue = !!this.usersTextEl && this.usersTextEl.scrollWidth > this.usersTextEl.clientWidth;
      if (nextValue !== this.isOverflow) {
        this.isOverflow = nextValue;
      }
    });
  }

  private emitReactionEvent(type: 'reaction-click' | 'detail-click') {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: [this.reaction],
    }));
  }

  private renderNames() {
    if (!this.names?.length) return nothing;
    return html`
      <div class="nc-reaction-users">
        <div class="nc-reaction-users-text">
          ${this.names.map((name, index) => html`${index > 0 ? ',' : nothing}<span>${name}</span>`)}
        </div>
        ${this.isOverflow ? html`
          <button class="nc-reaction-users-count" type="button" @click=${(event: MouseEvent) => {
            event.stopPropagation();
            this.emitReactionEvent('detail-click');
          }}>${this.i18n.t('reaction.total.users', this.displayCount)}</button>
        ` : nothing}
      </div>
    `;
  }

  private get displayCount(): string | number {
    return this.reaction.totalCount > 99 ? '99+' : this.reaction.totalCount;
  }

  render() {
    if (!this.reaction) return nothing;
    return html`
      <div class="nc-reaction ${this.reaction.hasCurrentUserReacted ? 'nc-reaction-active' : ''}">
        <button class="nc-reaction-emoji" type="button" @click=${(event: MouseEvent) => {
          event.stopPropagation();
          this.emitReactionEvent('reaction-click');
        }}>${this.reaction.reactionId}</button>
        ${this.showUsers ? this.renderNames() : html`
          <button class="nc-reaction-count" type="button" @click=${(event: MouseEvent) => {
            event.stopPropagation();
            this.emitReactionEvent('detail-click');
          }}>${this.displayCount}</button>
        `}
      </div>
    `;
  }
}
