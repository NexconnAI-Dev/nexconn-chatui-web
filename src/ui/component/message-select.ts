import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { I18nController } from '../i18n/lit';

export class MessageSelectElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .line {
      display: block;
      width: 100%;
      border: 1px dashed #E4E7ED;
    }
    .btn {
      position: absolute;
      padding: 0 12px;
      line-height: 34px;
      color: #41464F;
      background-color: #E3E7EF;
      border-radius: 10px;
      font-size: 14px;
      display: inline-block;
      margin-left: 68px;
      z-index: 2;
      top: -16px;
      cursor: pointer;
    }
  `;

  @property({ type: Boolean })
  declare selected: boolean | null;

  private i18n = new I18nController(this);

  private handleClick() {
    this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true }));
  }

  render() {
    const msg = this.selected ? this.i18n.t('message.list.select') : this.i18n.t('message.list.unselect');
    return html`
      <div class="nc-chatui-select">
        <span class="line"></span>
        <span class="btn" @click=${this.handleClick}>${msg}</span>
      </div>
    `;
  }
}
