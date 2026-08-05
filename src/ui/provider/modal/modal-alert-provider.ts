import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { I18nController } from '../../i18n/lit';
import { ctx } from '../context';
import { AlertEvent, ChatUIEvents } from '@lib/core/EventDefined';

export class ModalAlertProvider extends LitElement {
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
  `;

  @state() private declare content: string;

  private i18n = new I18nController(this);

  private _onAlertEvent = (e: AlertEvent) => {
    this.content = e.data;
  };

  connectedCallback() {
    super.connectedCallback();
    ctx().addEventListener(ChatUIEvents.ALERT_EVENT, this._onAlertEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    ctx().removeEventListener(ChatUIEvents.ALERT_EVENT, this._onAlertEvent);
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <nc-modal-provider @click=${() => this.handleCancel()}>
        <nc-modal-dialog width="286" @cancel=${() => this.handleCancel()}>
          <div class="nc-chatui-modal-dialog-header" slot="header">${this.i18n.t('dialog.tips.msg')}</div>
          <div class="nc-chatui-modal-dialog-content" slot="content">${this.content}</div>
          <div class="nc-chatui-modal-dialog-footer" slot="footer">
            <button class="cancel" @click=${() => this.handleCancel()}>${this.i18n.t('dialog.cancel.msg')}</button>
          </div>
        </nc-modal-dialog>
      </nc-modal-provider>
    `;
  }
}
