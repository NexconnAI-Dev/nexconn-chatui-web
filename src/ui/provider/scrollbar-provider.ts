import { LitElement, html, css } from 'lit';
import { state, query } from 'lit/decorators.js';
import { ctx } from './context';
import { InnerEvent } from '@lib/core/EventDefined';
import { createScrollControl } from '../../helper';

export class ScrollbarProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .nc-chatui-scrollbar {
      overflow: hidden;
      position: relative;
      height: 100%;
    }
    .wrap {
      overflow-y: scroll;
      height: 100%;
      scrollbar-width: none;
    }
    .wrap::-webkit-scrollbar {
      display: none;
    }
  `;

  @query('.wrap') private declare wrapRef: HTMLDivElement;
  @query('.resize-ref') private declare resizeRef: HTMLDivElement;

  @state() private declare ratioY: number;
  @state() private declare sizeHeight: number;
  @state() private declare moveY: number;
  @state() private declare showScrollbar: boolean;
  @state() private declare isHovering: boolean;

  private timer: any = null;
  private timerHide: any = null;
  private scrollControl: any;
  private resizeRefObserver: ResizeObserver | null = null;
  private wrapRefObserver: ResizeObserver | null = null;

  private updateScrollbar = () => {
    if (!this.wrapRef) return;
    const offsetHeight = this.wrapRef.offsetHeight;

    const originalHeight = offsetHeight ** 2 / this.wrapRef.scrollHeight;
    const height = Math.max(originalHeight, 20);
    this.ratioY =
      originalHeight / (offsetHeight - originalHeight) / (height / (offsetHeight - height));

    this.sizeHeight = originalHeight < offsetHeight ? Math.floor(height) : 0;
  };

  setScrollTop(value: number) {
    if (typeof value !== 'number') return;
    if (!this.wrapRef) return;
    this.wrapRef.scrollTop = value;
  }

  getViewportRect() {
    return this.wrapRef?.getBoundingClientRect();
  }

  getViewportSize() {
    if (!this.wrapRef) return { width: 0, height: 0 };
    return { width: this.wrapRef.clientWidth, height: this.wrapRef.clientHeight };
  }

  getScrollPosition() {
    if (!this.wrapRef) return { left: 0, top: 0 };
    return { left: this.wrapRef.scrollLeft, top: this.wrapRef.scrollTop };
  }

  get isScrollDisabled() {
    return this.scrollControl?.isScrollDisabled;
  }

  disableScroll() {
    this.scrollControl?.disableScroll();
  }

  enableScroll() {
    this.scrollControl?.enableScroll();
  }

  private handleMouseEnter = () => {
    this.isHovering = true;
    this.showScrollbar = true;
    if (this.timerHide) clearTimeout(this.timerHide);
  };

  private handleMouseLeave = () => {
    this.isHovering = false;
    if (this.timerHide) clearTimeout(this.timerHide);
    this.timerHide = setTimeout(() => {
      this.showScrollbar = false;
    }, 1000);
  };

  private handleMove = (e: CustomEvent) => {
    if (this.scrollControl?.isScrollDisabled) return;
    if (!this.wrapRef) return;
    const thumbPositionPercentage = e.detail[0];
    this.wrapRef.scrollTop = (thumbPositionPercentage * this.wrapRef.scrollHeight) / 100;
  };

  private handleScroll = () => {
    if (this.scrollControl?.isScrollDisabled) return;

    this.showScrollbar = true;
    if (this.timerHide) clearTimeout(this.timerHide);
    if (!this.isHovering) {
      this.timerHide = setTimeout(() => {
        this.showScrollbar = false;
      }, 1000);
    }

    if (!this.wrapRef) return;
    const { offsetHeight, scrollHeight, scrollTop } = this.wrapRef;
    this.moveY = Math.floor(((scrollTop * 100) / offsetHeight) * this.ratioY);

    const shouldTrigger = scrollHeight / (offsetHeight + scrollTop) <= 1.2;
    if (shouldTrigger) {
      if (!this.timer) {
        this.timer = setTimeout(async () => {
          this.dispatchEvent(new CustomEvent('loading', { bubbles: true, composed: true }));
          this.timer = null;
          clearTimeout(this.timer);
        }, 1000);
      }
    }
  };

  private _onDestroyUserCache = () => {
    this.setScrollTop(0);
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.updateScrollbar);
    ctx().addEventListener(InnerEvent.DESTROY_USER_CACHE, this._onDestroyUserCache);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.updateScrollbar);
    ctx().removeEventListener(InnerEvent.DESTROY_USER_CACHE, this._onDestroyUserCache);
    this.scrollControl?.enableScroll();
    if (this.timerHide) clearTimeout(this.timerHide);
    this.resizeRefObserver?.disconnect();
    this.wrapRefObserver?.disconnect();
  }

  protected firstUpdated() {
    // scrollControl expects a ref-like object such as { value: wrapRef }.
    this.scrollControl = createScrollControl({ value: this.wrapRef } as any);
    this.resizeRefObserver = new ResizeObserver(this.updateScrollbar);
    this.wrapRefObserver = new ResizeObserver(this.updateScrollbar);
    if (this.resizeRef) this.resizeRefObserver.observe(this.resizeRef);
    if (this.wrapRef) this.wrapRefObserver.observe(this.wrapRef);
    if (this.wrapRef) {
      this.wrapRef.addEventListener('loadedmetadata', this.updateScrollbar);
    }
    this.updateScrollbar();
  }

  protected updated() {
    // Synchronize moveY when ratioY changes.
    if (this.wrapRef) {
      const { offsetHeight, scrollTop } = this.wrapRef;
      this.moveY = Math.floor(((scrollTop * 100) / offsetHeight) * this.ratioY);
    }
  }

  render() {
    return html`
      <div class="nc-chatui-scrollbar">
        <div class="wrap" @scroll=${this.handleScroll}>
          <div class="resize-ref" style="min-height: 100%;">
            <slot></slot>
          </div>
        </div>
        ${this.sizeHeight ? html`
          <nc-scrollbar-thumb-provider
            .height=${this.sizeHeight}
            .move=${this.moveY}
            .scrollheight=${this.wrapRef?.scrollHeight}
            .ratio=${this.ratioY}
            style="opacity: ${this.showScrollbar ? 1 : 0}; transition: opacity 0.5s; pointer-events: ${this.showScrollbar ? 'auto' : 'none'}"
            @handlemove=${(e: CustomEvent) => this.handleMove(e)}
            @mouseenter=${this.handleMouseEnter}
            @mouseleave=${this.handleMouseLeave}
          ></nc-scrollbar-thumb-provider>
        ` : ''}
      </div>
    `;
  }
}
