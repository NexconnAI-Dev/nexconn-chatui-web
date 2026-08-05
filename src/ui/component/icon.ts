import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class IconElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-size: 0;
      position: relative;
      overflow: visible;
    }
    .nc-icon-image-wrap {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: inherit;
    }
    img {
      border: none;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    .nc-icon-online {
      display: block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #46db7a;
      border: 0.8px solid #ffffff;
      position: absolute;
      right: 0;
      bottom: 5px;
      box-sizing: border-box;
    }
  `;

  @property({ type: String })
  declare url: string;

  @property({ type: Boolean })
  declare online: boolean;

  @property({ type: Number })
  declare width: number;

  @property({ type: Number })
  declare height: number;

  @property({ type: Number })
  declare radius: number;

  render() {
    return html`
      <div class="nc-icon-image-wrap">
        <img src="${this.url}" alt="icon" />
      </div>
      ${this.online ? html`<span class="nc-icon-online"></span>` : ''}
    `;
  }

  updated() {
    this.style.width = `${this.width}px`;
    this.style.height = `${this.height}px`;
    this.style.borderRadius = `${this.radius}%`;
  }
}
