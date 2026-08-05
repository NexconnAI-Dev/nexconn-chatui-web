import { LitElement, html, css } from 'lit';
import { I18nController } from '../i18n/lit';

export class ChannelLoadingElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 30px;
    }
    span {
      display: block;
      text-align: center;
      line-height: 30px;
    }
  `;

  private i18n = new I18nController(this);

  render() {
    return html`<span>${this.i18n.t('channel.loading.msg')}</span>`;
  }
}
