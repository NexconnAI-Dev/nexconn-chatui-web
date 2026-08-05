import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { ctx } from '../context';
import { TAKE_PHOTO_CAMERA_ICON, TAKE_PHOTO_RETRY_ICON, MODAL_CLOSE_ICON, MODAL_CLOSE_HOVER_ICON, TAKE_PHOTO_SEND_ICON } from '../../../assets';
import { I18nController } from '../../i18n/lit';
import { ChatUIEvents } from '@lib/core/EventDefined';

export class ModalTakePhotoProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .take-photo-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      background: #00000080;
    }
    .take-photo-header {
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
    .btn-wrapper:hover {
      background-color: #D0DDFF;
    }
    .btn {
      width: 30px;
      height: 30px;
      cursor: pointer;
      display: block;
    }
    .video-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 0;
      position: relative;
      flex: 1;
      overflow: hidden;
    }
    .message {
      color: #a1a1a1;
      font-size: 14px;
      margin: 0 auto;
      position: absolute;
      z-index: 1;
    }
    .video-container video,
    .video-container img {
      object-fit: contain;
      width: auto;
      height: auto;
      max-width: 80%;
      max-height: 80%;
    }
    .floating-buttons {
      position: absolute;
      bottom: 12%;
      display: flex;
      align-items: center;
      gap: 20px;
      z-index: 3;
    }
    .floating-button {
      width: 78px;
      height: 34px;
      border-radius: 30px;
      background-color: #0047FF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
      color: #fff;
      font-size: 14px;
    }
    .floating-button img {
      width: 14px;
      height: 14px;
      display: block;
    }
    .retry-button img {
      width: 14px;
      height: 14px;
    }
    .floating-button .camera-icon {
      width: 20px;
      height: 20px;
    }
    .button-text {
      margin-left: 4px;
    }
  `;

  @state() private declare stream: MediaStream | null;
  @state() private declare photo: string;
  @state() private declare closeHover: boolean;
  @state() private declare errormsg: string;

  private blob: Blob | null = null;
  private capturing: Promise<MediaStream> | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private imageEl: HTMLImageElement | null = null;
  private containerEl: HTMLElement | null = null;
  private i18n = new I18nController(this);

  private get message(): string {
    if (this.errormsg) {
      return this.i18n.t('take-photo.msg.camera-startup-failure', this.errormsg);
    }
    if (!this.stream) {
      return this.i18n.t('take-photo.msg.camera-starting');
    }
    return '';
  }

  private handleCancel = () => {
    if (this.photo) {
      URL.revokeObjectURL(this.photo);
      this.photo = '';
    }
    this.blob = null;
    this.destroyStream();
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  };

  private async handleRetry() {
    URL.revokeObjectURL(this.photo);
    this.photo = '';
    this.blob = null;
    await this.updateComplete;
  }

  private async takeStream() {
    if (this.capturing) return this.capturing;
    try {
      this.capturing = navigator.mediaDevices.getUserMedia({
        video: { width: 960, height: 720, aspectRatio: 4 / 3 }
      });
      this.stream = await this.capturing;
    } catch (error: any) {
      this.errormsg = error.message;
    }
  }

  private async destroyStream() {
    if (this.capturing) {
      const mediaStream = await this.capturing;
      mediaStream?.getTracks().forEach(track => track.stop());
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.capturing = null;
    this.stream = null;
  }

  private takePhotoHandle(): Promise<Blob> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const video = this.videoEl!;
      const { width, height } = video;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      context.drawImage(video, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob!), 'image/jpg', 1);
    });
  }

  private async takePhoto() {
    this.blob = await this.takePhotoHandle();
    this.photo = URL.createObjectURL(this.blob);
    await this.updateComplete;
    this.resize();
  }

  private sendImage() {
    const context = ctx();
    const channel = context.channelModule.getOpenedChannelModel()!;
    context.message.sendImages(
      channel.channelIdentifier,
      [new File([this.blob!], `screenshot-${Date.now()}.jpg`, { type: 'image/jpg' })]
    );
    this.handleCancel();
  }

  private resize = () => {
    const video = this.videoEl;
    const container = this.containerEl;
    const image = this.imageEl;
    if (!container) return;

    const { scrollWidth: width, scrollHeight: height } = container;
    const aspectRatio = 4 / 3;
    let videoWidth = width;
    let videoHeight = width / aspectRatio;

    if (videoHeight > height) {
      videoHeight = height;
      videoWidth = height * aspectRatio;
    }

    if (video) {
      video.width = videoWidth;
      video.height = videoHeight;
    }
    if (image) {
      image.width = videoWidth;
      image.height = videoHeight;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    ctx().addEventListener(ChatUIEvents.CHANNEL_SELECTED, this.handleCancel);
    window.addEventListener('resize', this.resize);
    this.takeStream().then(async () => {
      await this.updateComplete;
      if (this.videoEl) {
        this.videoEl.addEventListener('loadedmetadata', this.resize);
      }
      this.resize();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    ctx().removeEventListener(ChatUIEvents.CHANNEL_SELECTED, this.handleCancel);
    window.removeEventListener('resize', this.resize);
    if (this.videoEl) {
      this.videoEl.removeEventListener('loadedmetadata', this.resize);
    }
    this.destroyStream();
  }

  protected updated() {
    const root = this.shadowRoot!;
    this.videoEl = root.querySelector('video');
    this.imageEl = root.querySelector('.photo-preview');
    this.containerEl = root.querySelector('.video-container');

    if (this.videoEl && this.stream && !this.videoEl.srcObject) {
      this.videoEl.srcObject = this.stream;
    }
  }

  render() {
    return html`
      <nc-modal-provider @click=${this.handleCancel}>
        <div class="take-photo-container" @click=${(e: Event) => e.stopPropagation()}>
          <div class="take-photo-header">
            <div class="btn-wrapper"
              @mouseenter=${() => { this.closeHover = true; }}
              @mouseleave=${() => { this.closeHover = false; }}
            >
              <img class="btn" @click=${this.handleCancel}
                src=${this.closeHover ? MODAL_CLOSE_HOVER_ICON : MODAL_CLOSE_ICON}
                alt="Close Icon">
            </div>
          </div>
          <div class="video-container">
            <video
              ?hidden=${!(!this.photo && this.stream)}
              playsinline
              autoplay
            ></video>
            <img class="photo-preview"
              ?hidden=${!this.photo}
              src=${this.photo || ''}
              alt="Photo"
            >
            ${!this.stream ? html`<span class="message">${this.message}</span>` : ''}
            ${this.stream ? html`
              <div class="floating-buttons">
                ${this.photo ? html`
                  <div class="floating-button retry-button" @click=${() => this.handleRetry()}>
                    <img src=${TAKE_PHOTO_RETRY_ICON} alt="Retry Icon">
                    <span class="button-text">${this.i18n.t('take-photo.retry-btn.label')}</span>
                  </div>
                ` : ''}
                <div class="floating-button action-button" @click=${() => !this.photo ? this.takePhoto() : this.sendImage()}>
                  ${!this.photo ? html`<img class="camera-icon" src=${TAKE_PHOTO_CAMERA_ICON} alt="Camera Icon">` : html`<img src=${TAKE_PHOTO_SEND_ICON} alt="Send Icon">`}
                  ${this.photo ? html`<span class="button-text">${this.i18n.t('take-photo.send-btn.label')}</span>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </nc-modal-provider>
    `;
  }
}
