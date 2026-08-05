import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { I18nController } from '../i18n/lit';

type MentionedUser = {
  name: string;
  nickname?: string;
  userId: string;
  portraitUri: string;
};

export class MentionUsersPanelProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .mention-users-panel {
      width: 100%;
      align-items: center;
      max-height: 124px;
      overflow: scroll;
      border-top: 1px solid #efefef;
    }
    .div-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 8px 20px;
      cursor: pointer;
      font-size: 12px;
    }
    .div-item:hover {
      background-color: #e9f0fb;
      border-radius: 8px;
    }
    .icon {
      margin-right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
  `;

  @property({ type: Array })
  declare members: MentionedUser[];

  @property({ type: Boolean })
  declare mentionAll: boolean;

  private i18n = new I18nController(this);

  render() {
    return html`
      <div class="mention-users-panel" @click=${(e: Event) => e.stopPropagation()}>
        ${this.mentionAll ? html`
          <div class="div-item" @click=${() => this.dispatchEvent(new CustomEvent('mention-all', { bubbles: true, composed: true }))}>
            ${this.i18n.t('channel.mentioned.all.msg')}
          </div>
        ` : ''}
        ${(this.members || []).map(item => html`
          <div class="div-item" @click=${() => this.dispatchEvent(new CustomEvent('mention', { detail: item.userId, bubbles: true, composed: true }))}>
            ${item.portraitUri ? html`<img class="icon" src="${item.portraitUri}" alt="User Portrait"/>` : ''}
            <span>${item.nickname || item.name}</span>
          </div>
        `)}
      </div>
    `;
  }
}
