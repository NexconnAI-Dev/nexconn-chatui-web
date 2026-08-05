import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class LatestMessageElement extends LitElement {
  static styles = css`
    :host {
      color: #7C838E;
      font-weight: 400;
      font-size: 12px;
      display: flex;
    }
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      line-height: 18px;
      word-break: break-all;
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }
  `;

  @property({ type: String })
  declare message: string;

  render() {
    return html`<span>${this.message}</span>`;
  }
}
