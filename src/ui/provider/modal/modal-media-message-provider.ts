import { LitElement, html, css, nothing } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { ImageMessageContent, MessageType, ShortVideoMessageContent } from '@nexconn/chat';
import { ctx } from '../context';
import {
  MODAL_CLOSE_ICON, MODAL_DOWNLOAD_ICON, MODAL_UP_ICON,
  MODAL_UP_HOVER_ICON, MODAL_DOWN_ICON, MODAL_DOWN_HOVER_ICON,
  MODAL_DOWNLOAD_HOVER_ICON, MODAL_CLOSE_HOVER_ICON
} from '../../../assets';
import { IMAGE_FAILED } from '../../../assets/index';
import { ChatUIEvents, MessagesDeletedEvent } from '../../../core/EventDefined';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

export class ModalMediaMessageProvider extends LitElement {
  static styles = css`
    :host { display: block; }
    /* Enforce [hidden] inside the shadow root against external img display rules. */
    [hidden] {
      display: none !important;
    }
    p { margin: 0; padding: 0; }
    .modal-media-message-provider .nc-chatui-modal-provider {
      background-color: #00000080;
    }
    .media-message-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .media-message-box {
      width: 100%;
      flex: 1;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 0;
    }
    .media-message-box.self-start {
      align-items: self-start;
    }
    .media-message-header {
      width: 100%;
      height: 54px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0 25px;
      background-color: #FFFFFF;
      box-sizing: border-box;
      z-index: 2;
      flex-shrink: 0;
    }
    .media-message {
      width: 50%;
      font-size: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1;
      max-width: 100%;
    }
    .loading-spinner-svg {
      animation: spin 1s linear infinite;
      margin: 20px auto;
      flex-shrink: 0;
    }
    .media-message-preview {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .media-message-preview img {
      width: 100%;
      height: auto;
      object-fit: contain;
      vertical-align: top;
    }
    img.media-message-fail {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .menu {
      display: flex;
      align-items: center;
      gap: 24px;
      z-index: 2;
    }
    .btn-wrapper {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    .btn-wrapper:hover { background-color: #D0DDFF; }
    .btn {
      width: 30px;
      height: 30px;
      cursor: pointer;
      display: block;
    }
    video, img { max-width: 100%; max-height: 100%; }
  `;

  @property({ type: Object }) declare message: ChatUIMessageModel;

  @state() private declare widthSize: number;
  @state() private declare heightSize: number;
  @state() private declare upHover: boolean;
  @state() private declare downHover: boolean;
  @state() private declare downloadHover: boolean;
  @state() private declare closeHover: boolean;
  /** loading: remote image loading; loaded: success; error: failure with placeholder. */
  @state() private declare loadState: 'loading' | 'loaded' | 'error';
  @state() private declare selfStart: boolean;

  @query('.media-message img') private declare imgRef: HTMLImageElement;
  @query('.media-message-box') private declare boxRef: HTMLDivElement;

  connectedCallback() {
    super.connectedCallback();
    this.widthSize = 50;
    this.heightSize = 80;
    this.upHover = false;
    this.downHover = false;
    this.downloadHover = false;
    this.closeHover = false;
    this.loadState = 'loading';
    this.selfStart = false;
    ctx().addEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    ctx().removeEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
  }

  private _onDeleteMessages = (e: MessagesDeletedEvent) => {
    e.data.forEach((item) => {
      const { messageId } = item;
      if (messageId === this.message.messageId) {
        ctx().alert('alert.message-deleted');
        this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
      }
    });
  };

  private handleCancel = () => {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  };

  private handleChangeHeight = (num: number, e: Event) => {
    e.stopPropagation();
    if (this.message.messageType === MessageType.SHORT_VIDEO) {
      if ((this.heightSize + num) > 100 || (this.heightSize + num) < 50) return;
      this.heightSize = this.heightSize + num;
    } else {
      if (this.imgRef && this.boxRef) {
        this.selfStart = this.imgRef.clientHeight > this.boxRef.clientHeight;
      }
      if ((this.widthSize + num) > 70 || (this.widthSize + num) < 10) return;
      this.widthSize = this.widthSize + num;
    }
  };

  private handleFileDownload = () => {
    this.dispatchEvent(new CustomEvent('download', { bubbles: true, composed: true }));
  };

  private handleLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img.src === IMAGE_FAILED) return;
    this.loadState = 'loaded';
    if (this.imgRef && this.boxRef) {
      this.selfStart = this.imgRef.clientHeight > this.boxRef.clientHeight;
    }
  };

  private handleError = () => {
    this.loadState = 'error';
  };

  private get thumbnailBase64(): string {
    const { messageType, content } = this.message;
    switch (messageType) {
      case MessageType.IMAGE:
        return (content as ImageMessageContent).thumbnailBase64;
      case MessageType.SHORT_VIDEO:
        return (content as ShortVideoMessageContent).thumbnailBase64;
      default:
        return '';
    }
  }

  render() {
    const { messageType } = this.message;
    const isImage = messageType === MessageType.IMAGE || messageType === MessageType.GIF;
    const isVideo = messageType === MessageType.SHORT_VIDEO;

    return html`
      <div class="modal-media-message-provider">
        <nc-modal-provider @click=${this.handleCancel}>
          <div class="media-message-container">
            <div class="media-message-header" @click=${(e: Event) => e.stopPropagation()}>
              <div class="menu">
                <div class="btn-wrapper"
                  @mouseenter=${() => { this.upHover = true; }}
                  @mouseleave=${() => { this.upHover = false; }}>
                  <img class="btn" .src=${this.upHover ? MODAL_UP_HOVER_ICON : MODAL_UP_ICON}
                    @click=${(e: Event) => this.handleChangeHeight(5, e)} alt="MODAL_UP_ICON">
                </div>
                <div class="btn-wrapper"
                  @mouseenter=${() => { this.downHover = true; }}
                  @mouseleave=${() => { this.downHover = false; }}>
                  <img class="btn" .src=${this.downHover ? MODAL_DOWN_HOVER_ICON : MODAL_DOWN_ICON}
                    @click=${(e: Event) => this.handleChangeHeight(-5, e)} alt="MODAL_DOWN_ICON">
                </div>
                <div class="btn-wrapper"
                  @mouseenter=${() => { this.downloadHover = true; }}
                  @mouseleave=${() => { this.downloadHover = false; }}>
                  <img class="btn" .src=${this.downloadHover ? MODAL_DOWNLOAD_HOVER_ICON : MODAL_DOWNLOAD_ICON}
                    @click=${this.handleFileDownload} alt="MODAL_DOWNLOAD_ICON">
                </div>
                <div class="btn-wrapper"
                  @mouseenter=${() => { this.closeHover = true; }}
                  @mouseleave=${() => { this.closeHover = false; }}>
                  <img class="btn" .src=${this.closeHover ? MODAL_CLOSE_HOVER_ICON : MODAL_CLOSE_ICON}
                    @click=${this.handleCancel} alt="MODAL_CLOSE_ICON">
                </div>
              </div>
            </div>
            ${isImage ? html`
              <div class="media-message-box ${this.selfStart ? 'self-start' : ''}"
                style="max-height: calc(100% - 54px)">
                <div class="media-message" style="width: ${this.widthSize}%">
                  <svg ?hidden=${this.loadState !== 'loading'} class="loading-spinner-svg"
                    viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                    <path d="M512 1024c-282.7776 0-512-229.2224-512-512s229.2224-512 512-512 512 229.2224 512 512-229.2224 512-512 512z m0-921.6c-225.8944 0-409.6 183.7056-409.6 409.6s183.7056 409.6 409.6 409.6 409.6-183.7056 409.6-409.6-183.7056-409.6-409.6-409.6z" fill="#ffffff" opacity="0.3"></path>
                    <path d="M512 1024C229.2224 1024 0 794.7776 0 512c0-28.2624 22.9376-51.2 51.2-51.2s51.2 22.9376 51.2 51.2c0 225.8944 183.7056 409.6 409.6 409.6s409.6-183.7056 409.6-409.6c0-225.8944-183.7056-409.6-409.6-409.6-28.2624 0-51.2-22.9376-51.2-51.2s22.9376-51.2 51.2-51.2c282.7776 0 512 229.2224 512 512s-229.2224 512-512 512z" fill="#ffffff"></path>
                  </svg>
                  <div class="media-message-preview">
                    <img ?hidden=${this.loadState === 'loading'}
                      class=${this.loadState === 'error' ? 'media-message-fail' : ''}
                      .src=${this.loadState === 'error'
                        ? IMAGE_FAILED
                        : (this.message.content as ImageMessageContent).remoteUrl}
                      @click=${(e: Event) => e.stopPropagation()}
                      @load=${this.handleLoad}
                      @error=${this.handleError}
                      alt="image">
                  </div>
                </div>
              </div>
            ` : nothing}
            ${isVideo ? html`
              <div class="media-message-box" style="max-height: calc(100% - 54px)">
                <div class="media-message" style="height: ${this.heightSize}%">
                  <video
                    .poster=${'data:image/png;base64,' + this.thumbnailBase64}
                    style="height: 100%;"
                    @click=${(e: Event) => e.stopPropagation()}
                    .src=${(this.message.content as ShortVideoMessageContent).remoteUrl}
                    controls>
                    <track kind="subtitles">
                    <track kind="description">
                  </video>
                </div>
              </div>
            ` : nothing}
          </div>
        </nc-modal-provider>
      </div>
    `;
  }
}
