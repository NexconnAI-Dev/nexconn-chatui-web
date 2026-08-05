import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { I18nController } from '../i18n/lit';
import { MULTI_CHOICE_MENU_CANCEL_ICON, MULTI_CHOICE_MENU_CANCEL_HOVER_ICON } from '../../assets';
import { ReplyMessageInfo } from '../provider/input-helper';

export class InputReplyBarElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .replay-bar {
      display: flex;
      flex-direction: row;
      align-items: center;
      border-radius: 8px;
      height: 36px;
      padding-top: 8px;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }
    .content {
      margin-left: 8px;
      box-sizing: border-box;
      width: calc(100% - 50px - 16px);
      flex: 1;
      display: flex;
      height: 100%;
      background-color: #F3F5FA;
      border-radius: 10px;
      font-size: 14px;
      color: #020814;
    }
    .message-desc {
      flex: 1;
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      justify-content: center;
      width: calc(100% - 120px);
      padding-right: 10px;
      margin-left: 4px;
      overflow: hidden;
    }
    .desc {
      color: #020814;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .reply-prefix {
      flex-shrink: 0;
    }
    .desc-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .thumbnail {
      flex-shrink: 0;
      height: 24px;
      width: auto;
      max-width: 100px;
      border: none;
      padding: 0;
      box-sizing: border-box;
      object-fit: contain;
      vertical-align: middle;
    }
    .cancel-btn {
      display: flex;
      width: 24px;
      margin-left: 10px;
      flex-direction: column;
      justify-content: center;
      vertical-align: middle;
      cursor: pointer;
    }
    .cancel-btn img {
      border-radius: 8px;
    }
  `;

  @property({ type: Object })
  declare info: ReplyMessageInfo;

  @state()
  private declare isHovered: boolean;

  private i18n = new I18nController(this);

  private get reply(): string {
    return this.i18n.t('input.reply.prefix') + (this.info.senderUserName || '');
  }

  render() {
    return html`
      <div class="replay-bar">
        <div class="cancel-btn"
          @click=${() => this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))}
          @mouseenter=${() => { this.isHovered = true; }}
          @mouseleave=${() => { this.isHovered = false; }}
        >
          <img src=${this.isHovered ? MULTI_CHOICE_MENU_CANCEL_HOVER_ICON : MULTI_CHOICE_MENU_CANCEL_ICON} alt="Cancel">
        </div>
        <div class="content">
          <div class="message-desc">
            <div class="desc">
              <span class="reply-prefix">${this.reply}:</span>
              <span class="desc-text">${this.info.digest}</span>
              ${this.info.thumbnail ? html`<img class="thumbnail" src=${this.info.thumbnail} alt="Thumbnail Image">` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
