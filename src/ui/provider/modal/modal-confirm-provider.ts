import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { I18nController } from '../../i18n/lit';
import { ctx } from '../context';
import { ConfirmEvent, ChatUIEvents } from '@lib/core/EventDefined';

export class ModalConfirmProvider extends LitElement {
  static styles = css`
    :host { display: block; }
    .nc-chatui-modal-dialog-header {
      font-size: 14px;
      border-bottom: 1px solid #EAEAEA;
      padding: 10px 30px;
      line-height: 20px;
    }
    .nc-chatui-modal-dialog-content {
      font-size: 12px;
      padding: 15px 30px;
    }
    .nc-chatui-modal-dialog-footer {
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .nc-chatui-modal-dialog-footer button {
      min-width: 70px;
      text-decoration: none;
      border-radius: 3px;
      outline: none;
      font-size: 12px;
      padding: 5px 15px;
      border: 0;
      margin: 0 23px;
      cursor: pointer;
    }
    .nc-chatui-modal-dialog-footer .cancel {
      border: 1px solid #DEDEDE;
      background-color: #F5F5F5;
    }
    .nc-chatui-modal-dialog-footer .confirm {
      border: 1px solid #0099FF;
      background-color: #0099FF;
      color: #FFFFFF;
    }
  `;

  @state() private declare content: string;

  private i18n = new I18nController(this);

  private _onConfirmEvent = (e: ConfirmEvent) => {
    this.content = e.data;
  };

  connectedCallback() {
    super.connectedCallback();
    ctx().addEventListener(ChatUIEvents.CONFIRM_EVENT, this._onConfirmEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    ctx().removeEventListener(ChatUIEvents.CONFIRM_EVENT, this._onConfirmEvent);
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }

  private handleConfirm() {
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <nc-modal-provider @click=${() => this.handleCancel()}>
        <nc-modal-dialog width="286">
          <div class="nc-chatui-modal-dialog-header" slot="header">${this.i18n.t('dialog.tips.msg')}</div>
          <div class="nc-chatui-modal-dialog-content" slot="content">${this.content}</div>
          <div class="nc-chatui-modal-dialog-footer" slot="footer">
            <button class="cancel" @click=${() => this.handleCancel()}>${this.i18n.t('dialog.cancel.msg')}</button>
            <button class="confirm" @click=${() => this.handleConfirm()}>${this.i18n.t('dialog.confirm.msg')}</button>
          </div>
        </nc-modal-dialog>
      </nc-modal-provider>
    `;
  }
}
