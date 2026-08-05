import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class MessageTimeElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      text-align: center;
      margin-bottom: 10px;
    }
    span {
      display: inline-block;
      font-size: 12px;
      line-height: 20px;
      padding: 0 12px;
      color: #7C838E;
      border-radius: 20px;
    }
  `;

  @property({ type: String })
  declare time: string;

  render() {
    return html`<span>${this.time}</span>`;
  }
}
