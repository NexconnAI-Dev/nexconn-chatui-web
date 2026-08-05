import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { isMobileDevice } from '../../../helper';

export class ModalDialogElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-chatui-modal-dialog {
      background-color: #fff;
      border-radius: 5px;
    }
  `;

  @property({ type: Number })
  declare width: number;

  @property({ type: Number })
  declare width_height: number;

  private isH5 = false;

  connectedCallback() {
    super.connectedCallback();
    this.checkDevice();
    window.addEventListener('resize', this.checkDevice);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.checkDevice);
  }

  private checkDevice = () => {
    const h5 = isMobileDevice();
    if (h5 !== this.isH5) {
      this.isH5 = h5;
      this.requestUpdate();
    }
  };

  private get dialogStyle() {
    const style: Record<string, string> = {
      width: this.isH5 ? '80%' : `${this.width}px`,
      margin: this.isH5 ? '0 auto' : '',
    };
    const height = this.width_height ?? -1;
    if (height !== -1) {
      style['height'] = `${height}px`;
    }
    return Object.entries(style).map(([k, v]) => v ? `${k}:${v}` : '').filter(Boolean).join(';');
  }

  render() {
    return html`
      <div class="nc-chatui-modal-dialog"
        style="${this.dialogStyle}"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <slot name="header"></slot>
        <slot name="content"></slot>
        <slot name="footer"></slot>
      </div>
    `;
  }
}
