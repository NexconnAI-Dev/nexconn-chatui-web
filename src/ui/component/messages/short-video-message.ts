import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { PLAY_ICON } from '@lib/assets/index';
import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ctx } from '@lib/ui/provider/context';
import { formatTimeLength } from '../../../helper';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ShortVideoMessageContent } from '@nexconn/chat';

export class ShortVideoMessageElement extends LitElement {
  static styles = css`
    :host {
      text-align: center;
    }
    .wraper {
      position: relative;
      display: inline-block;
    }
    .wraper .time {
      position: absolute;
      bottom: 8px;
      right: 6px;
      color: #fff;
      font-size: 14px;
      z-index: 2;
    }
    .wraper > img {
      max-width: 200px;
      border-radius: 10px;
      border: 1px solid #E4E7ED;
      vertical-align: bottom;
    }
    .sight-mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #00000080;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 10px;
      z-index: 1;
    }
    .play-icon {
      width: 36px;
      height: 36px;
      border: none;
    }
    .marked {
      background-color: rgba(0, 0, 0, .6);
      height: 100%;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<ShortVideoMessageContent>;

  private adjustScroll() {
    // Safari may report the final image height after message insertion; recalibrate the list bottom once the image is ready.
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL));
  }

  render() {
    const src = `data:image/png;base64,${this.message?.content?.thumbnailBase64}`;
    const duration = formatTimeLength(Math.floor(this.message?.content?.duration));

    return html`
      <nc-file-transfer-ctrl-provider .message=${this.message}>
        <div class="wraper">
          <img src="${src}" alt="${this.message?.content?.name}"
            @load=${() => this.adjustScroll()}
            @error=${() => this.adjustScroll()}
          />
          <div class="sight-mask">
            <img class="play-icon" src="${PLAY_ICON}" alt="play" />
          </div>
          <span class="time">${duration}</span>
        </div>
        <div slot="marked" class="marked"></div>
      </nc-file-transfer-ctrl-provider>
    `;
  }
}
