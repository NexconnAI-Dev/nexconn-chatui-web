import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { CHANNELS_EMPTY_ICON } from '../../assets';

export class ChannelEmptyElement extends LitElement {
  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      line-height: 24px;
      background: #fcfcfc;
      color: #b3b3b3;
      font-size: 16px;
    }
    img {
      margin-bottom: 10px;
      width: 60px;
      height: 60px;
    }
  `;

  @property({ type: String })
  declare desc: string;

  render() {
    return html`<img src="${CHANNELS_EMPTY_ICON}" alt="No Channels Available"><span>${this.desc}</span>`;
  }
}
