import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class ChannelLabelElement extends LitElement {
  static styles = css`
    :host {
      color: #41464F;
      font-weight: 400;
      font-size: 14px;
      line-height: 20px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
      display: block;
    }
  `;

  @property({ type: String })
  declare name: string;

  render() {
    return html`${this.name}`;
  }
}
