import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { formatFileSize, formatFileName, isMobileDevice } from '../../../helper';
import { getFileTypeIconByName } from '../../../assets';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { FileMessageContent } from '@nexconn/chat';

export class FileMessageElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .file-message {
      display: flex;
      align-items: center;
      padding: 20px;
    }
    .icon {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .file-message-icon {
      width: 44px;
      height: 44px;
      display: block;
      object-fit: contain;
    }
    .desc {
      font-size: 12px;
      line-height: 18px;
      padding: 0 6px;
    }
    .name {
      max-width: 360px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #020814;
    }
    @media (max-width: 768px) {
      .name {
        max-width: 200px;
      }
    }
    .size {
      color: #7C838E;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<FileMessageContent>;

  render() {
    if (!this.message) return html``;
    const maxLength = isMobileDevice() ? 10 : 40;
    const endLength = isMobileDevice() ? 5 : 8;
    const content = this.message.content as any;
    return html`
      <div class="file-message">
        <div class="icon">
          <nc-file-transfer-ctrl-provider .message=${this.message}>
            <img class="file-message-icon" src=${getFileTypeIconByName(content.name ?? '')} alt="File Icon">
          </nc-file-transfer-ctrl-provider>
        </div>
        <div class="desc">
          <div class="name" title=${content.name}>${formatFileName(content.name, maxLength, endLength)}</div>
          <span class="size">${formatFileSize(content.size)}</span>
        </div>
      </div>
    `;
  }
}
