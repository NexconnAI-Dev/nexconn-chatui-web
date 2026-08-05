import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { I18nController } from '../i18n/lit';
import {
  MULTI_CHOICE_MENU_CANCEL_ICON,
  MULTI_CHOICE_MENU_CANCEL_BUTTON_HOVER_ICON,
  MSG_MENU_FORWARD_ICON,
  MSG_MENU_FORWARD_HOVER_ICON,
  MSG_MENU_MERGE_FORWARD_HOVER_ICON,
  MSG_MENU_MERGE_FORWARD_ICON,
} from '../../assets';

export class MultiChoiceMenuElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-multi-choice-menu {
      height: 80px;
      background-color: #fff;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      border-top: 1px solid #E4E7ED;
      font-size: 14px;
      color: #000000;
      padding: 0 16px;
    }
    .selected-count {
      flex: 1 auto;
      margin-left: 24px;
    }
    .button {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      margin-left: 32px;
    }
    .button.disabled {
      cursor: not-allowed;
    }
    .button.disabled .button-label {
      color: #c4c4c4;
    }
    .button:first-child {
      margin-left: 0;
    }
    .icon-wrapper {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background-color: #F3F5FA;
      margin-bottom: 4px;
    }
    .button img {
      width: 20px;
      height: 20px;
    }
    .cancel .icon-wrapper {
      background-color: #FFFFFF;
      width: 30px;
      height: 30px;
    }
    .button.forward:hover .icon-wrapper {
      background-color: #D0DDFF;
    }
    .button.cancel:hover .icon-wrapper {
      background-color: #D0DDFF;
    }
  `;

  @property({ type: Number })
  declare count: number;

  @state() private declare isCancelHover: boolean;
  @state() private declare isForwardHover: boolean;
  @state() private declare isMergeForwardHover: boolean;

  private i18n = new I18nController(this);

  private emit(type: string) {
    if (this.count === 0 && type !== 'cancel') return;
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
  }

  private get message(): string {
    return this.i18n.t('multi-choice.menu.selected-count', (this.count ?? 0).toString());
  }

  render() {
    return html`
      <div class="nc-multi-choice-menu">
        <!-- Cancel -->
        <div class="button cancel"
          @click=${() => this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))}
          @mouseenter=${() => { this.isCancelHover = true; }}
          @mouseleave=${() => { this.isCancelHover = false; }}
        >
          <div class="icon-wrapper">
            <img src=${this.isCancelHover ? MULTI_CHOICE_MENU_CANCEL_BUTTON_HOVER_ICON : MULTI_CHOICE_MENU_CANCEL_ICON} alt="Cancel">
          </div>
        </div>
        <!-- Selected count -->
        <span class="selected-count">${this.message}</span>
        <!-- Merge and forward -->
        <div class="button forward ${this.count === 0 ? 'disabled' : ''}"
          @click=${() => this.emit('merge-forward')}
          @mouseenter=${() => { this.isMergeForwardHover = true; }}
          @mouseleave=${() => { this.isMergeForwardHover = false; }}
        >
          <div class="icon-wrapper">
            <img src=${this.isMergeForwardHover && this.count > 0 ? MSG_MENU_MERGE_FORWARD_HOVER_ICON : MSG_MENU_MERGE_FORWARD_ICON} alt="Forward" style="opacity: ${this.count === 0 ? 0.4 : 1}">
          </div>
          <span class="button-label">${this.i18n.t('multi-choice.menu.merge-forward')}</span>
        </div>
        <!-- Forward individually -->
        <div class="button forward ${this.count === 0 ? 'disabled' : ''}"
          @click=${() => this.emit('forward')}
          @mouseenter=${() => { this.isForwardHover = true; }}
          @mouseleave=${() => { this.isForwardHover = false; }}
        >
          <div class="icon-wrapper">
            <img src=${this.isForwardHover && this.count > 0 ? MSG_MENU_FORWARD_HOVER_ICON : MSG_MENU_FORWARD_ICON} alt="Forward" style="opacity: ${this.count === 0 ? 0.4 : 1}">
          </div>
          <span class="button-label">${this.i18n.t('multi-choice.menu.forward-item-by-item')}</span>
        </div>
      </div>
    `;
  }
}
