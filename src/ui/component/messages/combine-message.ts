import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { I18nController } from '../../i18n/lit';
import { CombineMessageContent, ChannelType } from '@nexconn/chat';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

export class CombineMessageElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .combine-message {
      padding: 20px;
    }
    .title {
      font-size: 16px;
      padding-bottom: 12px;
      max-width: 350px;
      word-wrap: break-word;
      word-break: break-all;
      text-overflow: ellipsis;
      color: #020814;
    }
    .summary-content {
      font-family: inherit;
      font-size: 14px;
      line-height: 20px;
      color: #41464F;
      max-width: 350px;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-all;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .separator {
      border-top: 1px solid #E4E7ED;
      padding-top: 20px;
      margin-top: 10px;
      font-size: 14px;
      color: #41464F;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<CombineMessageContent>;

  private i18n = new I18nController(this);

  private get combineTitle(): string {
    const content = this.message?.content;
    if (!content) return '';
    const { channelType, nameList } = content;
    if (!channelType || !nameList) return '';
    if (channelType === ChannelType.DIRECT) {
      return nameList.length === 2
        ? this.i18n.t('private.combine-msg.title', ...nameList)
        : this.i18n.t('private.combine-msg.signal.title', ...nameList);
    }
    return this.i18n.t('group.combine-msg.title');
  }

  render() {
    if (!this.message) return html``;
    const content = this.message.content;
    // Show at most four summary lines, replacing embedded newlines with spaces and truncating overflow with an ellipsis.
    const summaryText = (content.summaryList || []).map((s) => s.replace(/\n/g, ' ')).slice(0, 4).join('\n');

    return html`
      <div class="combine-message">
        <div class="title">${this.combineTitle}</div>
        <pre class="summary-content">${summaryText}</pre>
        <div class="separator">
          <div>${this.i18n.t('combine-msg.chat-record')}</div>
        </div>
      </div>
    `;
  }
}
