import { LitElement, html, css } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { IMAGE_FAILED } from '@lib/assets/index';
import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ctx } from '@lib/ui/provider/context';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { GIFMessageContent } from '@nexconn/chat';

export class GifMessageElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 100%;
    }
    .gif-message-box {
      width: 247px;
      max-width: 100%;
      aspect-ratio: 1;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      border: 1px solid #E4E7ED;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<GIFMessageContent>;

  @query('img')
  private imgEl!: HTMLImageElement;

  @state() private declare url: string;

  private objectUrl?: string;

  private adjustScroll() {
    // GIF decoding and final layout may finish after message insertion, so recalibrate scrolling when the media state changes.
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL));
  }

  private handleError() {
    this.imgEl.src = IMAGE_FAILED;
    this.adjustScroll();
  }

  connectedCallback() {
    super.connectedCallback();
    this.objectUrl = this.message.file ? window.URL.createObjectURL(this.message.file) : undefined;
    this.url = this.objectUrl ?? this.message.content.remoteUrl;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.objectUrl) {
      window.URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }

  render() {
    return html`
      <nc-file-transfer-ctrl-provider .message=${this.message}>
        <div class="gif-message-box">
          <img src="${this.url}"
            alt="Gif Image"
            @load=${() => this.adjustScroll()}
            @error=${() => this.handleError()}
          />
        </div>
      </nc-file-transfer-ctrl-provider>
    `;
  }
}
