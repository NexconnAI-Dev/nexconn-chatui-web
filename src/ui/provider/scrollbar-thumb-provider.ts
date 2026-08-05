import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class ScrollbarThumbProvider extends LitElement {
  static styles = css`
    .nc-chatui-scrollbar-bar {
      position: absolute;
      right: 2px;
      bottom: 0px;
      z-index: 1;
      border-radius: 4px;
      width: 6px;
      top: 0px;
    }
    .nc-chatui-scrollbar-thumb {
      width: 100%;
      position: relative;
      cursor: pointer;
      border-radius: inherit;
      background-color: #909399;
      opacity: .3;
    }
    .nc-chatui-scrollbar-thumb:hover {
      background-color: #909399;
      opacity: .5;
    }
  `;

  @property({ type: Number }) declare height: number;
  @property({ type: Number }) declare move: number;
  @property({ type: Number }) declare scrollheight: number;
  @property({ type: Number }) declare ratio: number;

  private _cursorDown = false;
  private _originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  private _thumbClickY = 0;

  private get _trackEl(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector('.nc-chatui-scrollbar-bar') ?? null;
  }

  private get _thumbEl(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector('.nc-chatui-scrollbar-thumb') ?? null;
  }

  private get _offsetRatio(): number {
    const track = this._trackEl;
    const thumb = this._thumbEl;
    if (!track || !thumb) return 1;
    return (track.offsetHeight ** 2) / (this.scrollheight || 1) / (this.ratio || 1) / (thumb.offsetHeight || 1);
  }

  private _clickThumbHandler = (e: MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || [1, 2].includes(e.button)) return;
    window.getSelection()?.removeAllRanges();
    this._startDrag(e);
    const el = e.currentTarget as HTMLDivElement;
    this._thumbClickY = e.clientY - el.getBoundingClientRect().top;
  };

  private _clickTrackHandler = (e: MouseEvent) => {
    const track = this._trackEl;
    const thumb = this._thumbEl;
    if (!track || !thumb) return;
    const offset = Math.abs((e.target as HTMLElement).getBoundingClientRect().top - e.clientY);
    const thumbHalf = thumb.offsetHeight / 2;
    const pct = ((offset - thumbHalf) * 100 * this._offsetRatio) / track.offsetHeight;
    this.dispatchEvent(new CustomEvent('handlemove', { detail: pct, bubbles: true, composed: true }));
  };

  private _startDrag(e: MouseEvent) {
    e.stopImmediatePropagation();
    this._cursorDown = true;
    document.addEventListener('mousemove', this._mouseMoveHandler);
    document.addEventListener('mouseup', this._mouseUpHandler);
    this._originalOnSelectStart = document.onselectstart;
    document.onselectstart = () => false;
  }

  private _mouseMoveHandler = (e: MouseEvent) => {
    const track = this._trackEl;
    const thumb = this._thumbEl;
    if (!track || !thumb || !this._cursorDown) return;
    const offset = (track.getBoundingClientRect().top - e.clientY) * -1;
    const thumbClickPosition = thumb.offsetHeight - this._thumbClickY;
    const pct = ((offset - thumbClickPosition) * 100 * this._offsetRatio) / track.offsetHeight;
    this.dispatchEvent(new CustomEvent('handlemove', { detail: pct, bubbles: true, composed: true }));
  };

  private _mouseUpHandler = () => {
    this._cursorDown = false;
    this._thumbClickY = 0;
    document.removeEventListener('mousemove', this._mouseMoveHandler);
    document.removeEventListener('mouseup', this._mouseUpHandler);
    if (document.onselectstart !== this._originalOnSelectStart) {
      document.onselectstart = this._originalOnSelectStart;
    }
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    if (document.onselectstart !== this._originalOnSelectStart) {
      document.onselectstart = this._originalOnSelectStart;
    }
    document.removeEventListener('mouseup', this._mouseUpHandler);
  }

  render() {
    return html`
      <div class="nc-chatui-scrollbar-bar" @mousedown=${this._clickTrackHandler}>
        <div class="nc-chatui-scrollbar-thumb"
          style="height: ${this.height}px; transform: translateY(${this.move}%)"
          @mousedown=${this._clickThumbHandler}
        ></div>
      </div>
    `;
  }
}
