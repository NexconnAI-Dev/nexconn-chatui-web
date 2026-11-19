import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { formatTxtMessageContent } from '../../../helper';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { TextMessageContent } from '@nexconn/chat';
import { I18nController } from '../../i18n/lit';

export class TextMessageElement extends LitElement {
  static styles = css`
    p {
      margin: 0;
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
    .edited-marker {
      margin-left: 4px;
      color: #7C838E;
      font-size: 12px;
      white-space: nowrap;
      -webkit-user-select: none;
      user-select: none;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<TextMessageContent>;

  private i18n = new I18nController(this);

  private handleLinkClick(type: string, address: string) {
    const trimmed = address.trim();
    this.dispatchEvent(new CustomEvent('link', { detail: { type, address: trimmed }, bubbles: true, composed: true }));
  }

  render() {
    const contentInfo = formatTxtMessageContent(this.message?.content?.text || '');
    const editedMarker = this.message?.editTimestamp !== undefined
      ? html`<span class="edited-marker">(${this.i18n.t('message.edit.edited')})</span>`
      : '';

    if (contentInfo.type === 0) {
      return html`<p>${this.message?.content?.text || ''}${editedMarker}</p>`;
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
    })}${editedMarker}</p>`;
  }
}
