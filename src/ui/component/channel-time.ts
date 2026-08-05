import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class ChannelTimeElement extends LitElement {
  static styles = css`
    :host {
      color: #A1A1A1;
      font-weight: 400;
      font-size: 12px;
      line-height: 19px;
      flex: 1;
      text-align: right;
    }
  `;

  @property({ type: String })
  declare time: string;

  render() {
    return html`<span>${this.time}</span>`;
  }
}
