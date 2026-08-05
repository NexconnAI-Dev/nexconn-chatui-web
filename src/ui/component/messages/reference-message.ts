import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { Helper, ImageMessageContent, Message, MessageDirection, MessageType, ReferenceMessageContent, TextMessageContent } from '@nexconn/chat';
import { formatBase64Image } from '@lib/helper';
import { AUDIO_ICON, AUDIO_SELF_ICON } from '@lib/assets';
import { I18nController } from '../../i18n/lit';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

export class ReferenceMessageElement extends LitElement {
  static styles = css`
    .reference-box {
      padding: 20px;
      display: flex;
      min-width: 0;
    }
    .reference-box .header {
      border: 1px solid #020814;
      margin: 4px 5px 4px 0;
    }
    .reference-box .right {
      flex: 1;
      min-width: 0;
    }
    .reference-box .content {
      font-size: 12px;
      line-height: 18px;
      display: flex;
      align-items: center;
      color: #020814;
      min-width: 0;
    }
    .reference-box .content > img {
      flex-shrink: 0;
    }
    .reference-content {
      word-break: break-word;
      font-size: 14px;
      line-height: 22px;
      white-space: pre-wrap;
      padding: 4px 20px 20px 20px;
    }
    .reference-hr-line {
      border: 1px solid #0000001A;
      margin: 0 10px;
    }
    .message-desc {
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      justify-content: center;
      max-width: 100%;
      padding-right: 10px;
      margin-left: 4px;
      overflow: hidden;
      min-width: 0;
    }
    .desc {
      color: #020814;
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
    }
    .reply-prefix {
      flex-shrink: 0;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .desc-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .thumbnail {
      flex-shrink: 0;
      height: 36px;
      width: auto;
      max-width: 100px;
      border: none;
      padding: 0;
      box-sizing: border-box;
      object-fit: contain;
      vertical-align: middle;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<ReferenceMessageContent>;

  private i18n = new I18nController(this);

  private getReferenceContent(referencedMessage: Message): string {
    const { messageType, content } = referencedMessage;
    switch (messageType) {
      case MessageType.IMAGE: return this.i18n.t('message-type.RC:ImgMsg');
      case MessageType.GIF: return this.i18n.t('message-type.RC:GIFMsg');
      case MessageType.SHORT_VIDEO: return this.i18n.t('message-type.RC:SightMsg');
      case MessageType.FILE: return this.i18n.t('message-type.RC:FileMsg');
      case MessageType.HD_VOICE: return this.i18n.t('message-type.RC:HQVCMsg');
      case MessageType.TEXT:
      case MessageType.REFERENCE:
        return (content as TextMessageContent).text ?? '';
      default: return this.i18n.t('message-type.unknown');
    }
  }

  render() {
    const { content, direction: messageDirection, message } = this.message;
    // Unwrap the referenced message.
    const referencedMessage = Helper.unwrapReferenceMessage(message);
    const { content: referMsg, messageType: referMsgType } = referencedMessage;
    const isSend = messageDirection === MessageDirection.SEND;
    const borderColor = isSend ? '#fff' : '#f5f5f5';
    const types: string[] = [MessageType.IMAGE, MessageType.GIF, MessageType.SHORT_VIDEO];
    const showReferenceImage = types.includes(referMsgType);
    const reply = `${this.i18n.t('input.reply.prefix')} ${content.referMsgSenderId}`;

    return html`
      <div>
        <div class="reference-box" style="border-color: ${borderColor}">
          <div class="header"></div>
          <div class="right">
            <div class="content">
              ${content.referMsgType === MessageType.HD_VOICE ? html`
                <img src="${isSend ? AUDIO_SELF_ICON : AUDIO_ICON}" alt="">
              ` : ''}
              <div class="message-desc">
                <div class="desc">
                  <div class="reply-prefix">${reply}:</div>
                  ${
                    !showReferenceImage
                      ? html`
                      <div class="desc-text">
                        <span>${this.getReferenceContent(referencedMessage)}</span>
                        ${referMsgType === MessageType.FILE ? html`<span>${referMsg?.name}</span>` : ''}
                      </div>`
                      : ''
                  }
                  ${
                    showReferenceImage
                      ? html`<img class="thumbnail" src="${formatBase64Image((referMsg as ImageMessageContent)?.thumbnailBase64)}" alt="Thumbnail Image">`
                      : ''
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="reference-hr-line"></div>
        <div class="reference-content">${content.text}</div>
      </div>
    `;
  }
}
