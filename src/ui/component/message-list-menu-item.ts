import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class MessageListMenuItemElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      font-size: 12px;
      padding: 6px;
      border-radius: 5px;
      cursor: pointer;
    }
    :host(:hover) {
      background-color: #D2E1FE;
    }
    .content {
      flex: auto;
      padding-left: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  @property({ type: String })
  declare id: string;

  @property({ type: String })
  declare icon: string;

  @property({ type: String })
  declare label: string;

  render() {
    return html`
      <img src="${this.icon}" alt="icon">
      <div class="content"><span>${this.label}</span></div>
    `;
  }
}
