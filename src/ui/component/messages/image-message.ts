import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ctx } from '@lib/ui/provider/context';
import { formatBase64Image } from '../../../helper';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ImageMessageContent } from '@nexconn/chat';

export class ImageMessageElement extends LitElement {
  static styles = css`
    .thumbnail, .marked {
      width: 247px;
      max-height: 400px;
      border-radius: 10px;
      border: 1px solid #E4E7ED;
    }
    .marked {
      background-color: rgba(0, 0, 0, .6);
      height: 100%;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<ImageMessageContent>;

  private adjustScroll() {
    // Safari may report the final image height after message insertion; recalibrate the list bottom once the image is ready.
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL));
  }

  render() {
    return html`
      <nc-file-transfer-ctrl-provider .message=${this.message}>
        <img class="thumbnail"
          src="${formatBase64Image(this.message?.content?.thumbnailBase64)}"
          alt="Image"
          @load=${() => this.adjustScroll()}
          @error=${() => this.adjustScroll()}
        />
        <div slot="marked" class="marked"></div>
      </nc-file-transfer-ctrl-provider>
    `;
  }
}
