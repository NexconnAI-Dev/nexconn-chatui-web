import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { MessageType, SentStatus } from '@nexconn/chat';
import { ctx } from './context';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ChatUIEvents } from '@lib/core/EventDefined';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

export class FileTransferCtrlProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .content {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .marked {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      height: 22px;
      cursor: pointer;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  private readonly radius = 8;
  private readonly circleLen = Math.floor(2 * Math.PI * 8);

  private get downloadVisible(): boolean {
    return this.message?.messageType === MessageType.FILE
      && this.message.sentStatus !== SentStatus.SENDING
      && this.message.sentStatus !== SentStatus.FAILED;
  }

  private get retryVisible(): boolean {
    return !!(this.message?.file && this.message.progress === -1);
  }

  private get processVisible(): boolean {
    return !!(this.message?.file
      && typeof this.message.progress === 'number'
      && this.message.progress >= 0
      && this.message.progress < 100);
  }

  private get dashoffset(): number {
    const value = this.message?.progress || 0;
    return (100 - value) * this.circleLen / 100;
  }

  private handleDownload() {
    ctx().emit(new ChatUIEvent(ChatUIEvents.DOWNLOAD_LINK_EVENT, this.message));
  }

  private handleCancel() {
    ctx().message.cancelMessageSent(this.message);
  }

  private handleRetry() {
    ctx().message.resendMessage(this.message);
  }

  render() {
    const showOverlay = this.downloadVisible || this.retryVisible || this.processVisible;
    return html`
      <div class="content">
        <slot></slot>
        ${showOverlay ? html`<div class="marked"><slot name="marked"></slot></div>` : ''}
        ${this.downloadVisible ? html`
          <div class="btn" @click=${(e: Event) => { e.stopPropagation(); this.handleDownload(); }}>
            <svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle opacity="0.5" cx="11.5437" cy="10.7852" r="7" fill="black" />
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M14.4617 9.54688L11.5749 14.5469L8.68817 9.54687L11.0749 9.54687L11.0749 6.66123L12.0749 6.66123L12.0749 9.54687L14.4617 9.54688Z"
                fill="white" />
              <mask id="path-3-outside-1_2560_1087" maskUnits="userSpaceOnUse" x="1.74341" y="0.96875" width="20" height="20" fill="white">
                <rect fill="white" x="1.74341" y="0.96875" width="20" height="20" />
                <path d="M20.344 10.7691C20.344 15.6293 16.404 19.5694 11.5437 19.5694C6.68344 19.5694 2.74341 15.6293 2.74341 10.7691C2.74341 5.90878 6.68344 1.96875 11.5437 1.96875C16.404 1.96875 20.344 5.90878 20.344 10.7691ZM4.33424 10.7691C4.33424 14.7507 7.56203 17.9785 11.5437 17.9785C15.5254 17.9785 18.7532 14.7507 18.7532 10.7691C18.7532 6.78737 15.5254 3.55958 11.5437 3.55958C7.56203 3.55958 4.33424 6.78737 4.33424 10.7691Z" />
              </mask>
              <path d="M20.344 10.7691C20.344 15.6293 16.404 19.5694 11.5437 19.5694C6.68344 19.5694 2.74341 15.6293 2.74341 10.7691C2.74341 5.90878 6.68344 1.96875 11.5437 1.96875C16.404 1.96875 20.344 5.90878 20.344 10.7691ZM4.33424 10.7691C4.33424 14.7507 7.56203 17.9785 11.5437 17.9785C15.5254 17.9785 18.7532 14.7507 18.7532 10.7691C18.7532 6.78737 15.5254 3.55958 11.5437 3.55958C7.56203 3.55958 4.33424 6.78737 4.33424 10.7691Z"
                fill="white" fill-opacity="0.6" />
              <path d="M20.344 10.7691C20.344 15.6293 16.404 19.5694 11.5437 19.5694C6.68344 19.5694 2.74341 15.6293 2.74341 10.7691C2.74341 5.90878 6.68344 1.96875 11.5437 1.96875C16.404 1.96875 20.344 5.90878 20.344 10.7691ZM4.33424 10.7691C4.33424 14.7507 7.56203 17.9785 11.5437 17.9785C15.5254 17.9785 18.7532 14.7507 18.7532 10.7691C18.7532 6.78737 15.5254 3.55958 11.5437 3.55958C7.56203 3.55958 4.33424 6.78737 4.33424 10.7691Z"
                stroke="white" stroke-opacity="0.2" stroke-width="1.04019" mask="url(#path-3-outside-1_2560_1087)" />
            </svg>
          </div>
        ` : ''}
        ${this.retryVisible ? html`
          <div class="btn" @click=${(e: Event) => { e.stopPropagation(); this.handleRetry(); }}>
            <svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle opacity="0.5" cx="11.6465" cy="10.7852" r="10.7383" transform="rotate(-180 11.6465 10.7852)" fill="black" />
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M8.72876 12.0234L11.6155 7.02344L14.5023 12.0234L12.1155 12.0234L12.1155 14.9091L11.1155 14.9091L11.1155 12.0234L8.72876 12.0234Z"
                fill="white" />
              <mask id="path-3-outside-1_2560_1183" maskUnits="userSpaceOnUse" x="1.44678" y="0.601561" width="20" height="20" fill="black">
                <rect fill="white" x="1.44678" y="0.601561" width="20" height="20" />
                <path d="M2.84616 10.8013C2.84616 5.94098 6.78619 2.00094 11.6465 2.00094C16.5067 2.00094 20.4468 5.94098 20.4468 10.8013C20.4468 15.6615 16.5067 19.6016 11.6465 19.6016C6.78619 19.6016 2.84616 15.6615 2.84616 10.8013ZM18.8559 10.8013C18.8559 6.81957 15.6282 3.59177 11.6465 3.59177C7.66478 3.59177 4.43699 6.81957 4.43699 10.8013C4.43699 14.7829 7.66478 18.0107 11.6465 18.0107C15.6282 18.0107 18.8559 14.7829 18.8559 10.8013Z" />
              </mask>
              <path d="M2.84616 10.8013C2.84616 5.94098 6.78619 2.00094 11.6465 2.00094C16.5067 2.00094 20.4468 5.94098 20.4468 10.8013C20.4468 15.6615 16.5067 19.6016 11.6465 19.6016C6.78619 19.6016 2.84616 15.6615 2.84616 10.8013ZM18.8559 10.8013C18.8559 6.81957 15.6282 3.59177 11.6465 3.59177C7.66478 3.59177 4.43699 6.81957 4.43699 10.8013C4.43699 14.7829 7.66478 18.0107 11.6465 18.0107C15.6282 18.0107 18.8559 14.7829 18.8559 10.8013Z"
                fill="black" fill-opacity="0.6" />
              <path d="M2.84616 10.8013C2.84616 5.94098 6.78619 2.00094 11.6465 2.00094C16.5067 2.00094 20.4468 5.94098 20.4468 10.8013C20.4468 15.6615 16.5067 19.6016 11.6465 19.6016C6.78619 19.6016 2.84616 15.6615 2.84616 10.8013ZM18.8559 10.8013C18.8559 6.81957 15.6282 3.59177 11.6465 3.59177C7.66478 3.59177 4.43699 6.81957 4.43699 10.8013C4.43699 14.7829 7.66478 18.0107 11.6465 18.0107C15.6282 18.0107 18.8559 14.7829 18.8559 10.8013Z"
                stroke="white" stroke-opacity="0.2" stroke-width="1.04019" mask="url(#path-3-outside-1_2560_1183)" />
            </svg>
          </div>
        ` : ''}
        ${this.processVisible ? html`
          <div class="btn" @click=${(e: Event) => { e.stopPropagation(); this.handleCancel(); }}>
            <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle opacity="0.5" cx="11.605" cy="11.7227" r="10.7383" fill="black" />
              <mask id="path-2-outside-1_2560_1174" maskUnits="userSpaceOnUse" x="1.80469" y="1.90625" width="20" height="20" fill="black">
                <rect fill="white" x="1.80469" y="1.90625" width="20" height="20" />
                <path d="M20.4053 11.7066C20.4053 16.5668 16.4653 20.5069 11.605 20.5069C6.74472 20.5069 2.80469 16.5668 2.80469 11.7066C2.80469 6.84628 6.74472 2.90625 11.605 2.90625C16.4653 2.90625 20.4053 6.84628 20.4053 11.7066ZM4.39552 11.7066C4.39552 15.6882 7.62331 18.916 11.605 18.916C15.5867 18.916 18.8145 15.6882 18.8145 11.7066C18.8145 7.72487 15.5867 4.49708 11.605 4.49708C7.62331 4.49708 4.39552 7.72487 4.39552 11.7066Z" />
              </mask>
              <path d="M20.4053 11.7066C20.4053 16.5668 16.4653 20.5069 11.605 20.5069C6.74472 20.5069 2.80469 16.5668 2.80469 11.7066C2.80469 6.84628 6.74472 2.90625 11.605 2.90625C16.4653 2.90625 20.4053 6.84628 20.4053 11.7066ZM4.39552 11.7066C4.39552 15.6882 7.62331 18.916 11.605 18.916C15.5867 18.916 18.8145 15.6882 18.8145 11.7066C18.8145 7.72487 15.5867 4.49708 11.605 4.49708C7.62331 4.49708 4.39552 7.72487 4.39552 11.7066Z"
                fill="black" fill-opacity="0.6" />
              <path d="M20.4053 11.7066C20.4053 16.5668 16.4653 20.5069 11.605 20.5069C6.74472 20.5069 2.80469 16.5668 2.80469 11.7066C2.80469 6.84628 6.74472 2.90625 11.605 2.90625C16.4653 2.90625 20.4053 6.84628 20.4053 11.7066ZM4.39552 11.7066C4.39552 15.6882 7.62331 18.916 11.605 18.916C15.5867 18.916 18.8145 15.6882 18.8145 11.7066C18.8145 7.72487 15.5867 4.49708 11.605 4.49708C7.62331 4.49708 4.39552 7.72487 4.39552 11.7066Z"
                stroke="white" stroke-opacity="0.2" stroke-width="1.04019" mask="url(#path-2-outside-1_2560_1174)" />
              <circle class="progress-bar" cx="11.605" cy="11.7227" r=${this.radius} fill="none" stroke="white" stroke-width="1.9"
                stroke-dasharray=${this.circleLen} stroke-dashoffset=${this.dashoffset} transform="rotate(-90, 11.605, 11.7227)"/>
              <rect x="13.905" y="8.1875" width="1.74414" height="8.24933" transform="rotate(45 13.905 8.1875)" fill="white" />
              <rect x="8.07178" y="9.42188" width="1.74414" height="8.24933" transform="rotate(-45 8.07178 9.42188)" fill="white" />
            </svg>
          </div>
        ` : ''}
      </div>
    `;
  }
}
