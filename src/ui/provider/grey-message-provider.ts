import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { getMessageDigest, textarea, ctx } from './context';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { I18nController } from '../i18n/lit';
import { MessageType } from '@nexconn/chat';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { InnerEvent } from '@lib/core/EventDefined';

export class GreyMessageProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .grey-message {
      display: inline-block;
      color: #41464F;
      margin: 0 auto;
      padding: 8px;
      background-color: #F3F5FA;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      line-height: 20px;
    }
    .reedit {
      color: #337ecc;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      margin-left: 3px;
    }
    .reedit:hover {
      color: #0099FF;
    }
    .nc-chatui-grey-message {
      margin-bottom: 10px;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  private i18n = new I18nController(this);

  private originalObjectName = '';
  private recallContent = '';
  private recallTime = 0;
  private enableReedit = true;
  private timer: any = null;

  private async handleReedit() {
    if (!textarea.value) return;
    const content = textarea.value.value.length ? `\n${this.recallContent}` : this.recallContent;
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.SET_TEXTAREA_VALUE_EVENT, content));
  }

  async connectedCallback() {
    super.connectedCallback();
    const duration = Date.now() - this.recallTime;
    const allowedToReEditTime = ctx().allowedToReEditTime;
    if (duration > 1000 * allowedToReEditTime) {
      this.enableReedit = false;
    }
    if (!this.timer && this.originalObjectName === MessageType.TEXT && this.enableReedit) {
      this.timer = setTimeout(() => {
        this.enableReedit = false;
        clearTimeout(this.timer);
        this.timer = null;
        this.requestUpdate();
      }, 1000 * allowedToReEditTime - duration);
    }
    this.requestUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  render() {
    if (!this.message) return html``;
    return html`
      <div class="nc-chatui-grey-message">
        <div class="grey-message">
          ${getMessageDigest(this.message)}
          ${''}
        </div>
      </div>
    `;
  }
}
