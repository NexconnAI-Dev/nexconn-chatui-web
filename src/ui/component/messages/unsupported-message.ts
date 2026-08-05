import { LitElement, html, css } from 'lit';
import { I18nController } from '../../i18n/lit';

export class UnsupportMessageElement extends LitElement {
  static styles = css`
    p {
      margin: 0;
      padding: 0;
      word-break: break-word;
    }
  `;

  private i18n = new I18nController(this);

  render() {
    return html`<p>${this.i18n.t('message-type.unknown')}</p>`;
  }
}
