import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { formatTxtMessageContent } from '../../../helper';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { TextMessageContent } from '@nexconn/chat';

export class TextMessageElement extends LitElement {
  static styles = css`
    p {
      margin: 0;
      padding: 20px;
      word-break: break-word;
      font-size: 14px;
      line-height: 22px;
      white-space: pre-wrap;
    }
    a {
      color: #020814;
    }
    a:hover {
      color: #0047FF;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<TextMessageContent>;

  private handleLinkClick(type: string, address: string) {
    const trimmed = address.trim();
    this.dispatchEvent(new CustomEvent('link', { detail: { type, address: trimmed }, bubbles: true, composed: true }));
  }

  render() {
    const contentInfo = formatTxtMessageContent(this.message?.content?.text || '');

    if (contentInfo.type === 0) {
      return html`<p>${this.message?.content?.text || ''}</p>`;
    }

    return html`<p>${contentInfo.content.map((item, index) => {
      if (contentInfo.position.includes(index + 1)) {
        const addr = item.content;
        const href = item.type === 'mail' ? `mailto:${addr}` : addr;
        return html`<a
          href=${href}
          rel=${item.type === 'url' ? 'noopener noreferrer' : undefined}
          target=${item.type === 'url' ? '_blank' : undefined}
          @click=${(e: MouseEvent) => {
            e.preventDefault();
            this.handleLinkClick(item.type, addr);
          }}
          >${addr}</a>`;
      }
      return html`<span>${item.content}</span>`;
    })}</p>`;
  }
}
