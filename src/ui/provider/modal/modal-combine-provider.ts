import { LitElement, html, css } from 'lit';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { ChannelType, Helper, Message, } from '@nexconn/chat';
import { ctx, getMessageComponentTag } from '../context';
import { ICacheUserProfile } from '../../../modules/appdata/UserCache';
import { formatTime } from '@lib/helper';
import { ChatUIEvent } from '../../../core/ChatUIEvent';
import { LanguagePackEntries } from '@lib/languages';
import { ChatUIEvents, MessageLinckClick, MessagesDeletedEvent } from '../../../core/EventDefined';
import { I18nController } from '../../i18n/lit';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { MessageType, CombineMessageContent } from '@nexconn/chat';

export class ModalCombineProvider extends LitElement {
  static styles = css`
    :host { display: block; }
    p { margin: 0; padding: 0; }
    .modal-combine-provider {
      flex-direction: column;
      position: absolute;
      inset: 0px;
      z-index: 2;
      background-color: rgba(0, 0, 0, .5);
    }
    .nc-imkit-combine-body-iframe {
      height: 100%;
      background-color: #fff;
    }
    .nc-chatui-combine-box {
      background-color: #E6ECF3;
      height: 70%;
      width: 50%;
      box-shadow: 0px 10px 16px 0px #00000033;
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 8px;
      overflow: hidden;
    }
    .nc-imkit-combine-header {
      background-color: #FFFFFF;
      position: relative;
    }
    .title {
      text-align: center;
      line-height: 19px;
      font-size: 12px;
      padding: 11px 0;
    }
    .close {
      position: absolute;
      top: 50%;
      right: 15px;
      padding: 0 5px;
      transform: translate(0, -50%);
      cursor: pointer;
    }
    .nc-imkit-combine-body {
      flex: 1;
      overflow: hidden;
    }
    .nc-imkit-iframe {
      height: 100%;
      width: 100%;
      overflow: scroll;
      border: 0;
    }
    .nc-chatui-msg-list-item {
      display: flex;
      width: 100%;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .nc-chatui-msg-avatar {
      padding: 0 8px;
    }
    .nc-chatui-msg-bubble {
      padding: 0 10px 8px 12px;
      border-radius: 0px 8px 8px;
      font-size: 12px;
      line-height: 16px;
      background-color: #fff;
    }
    .name {
      font-weight: 500;
      font-size: 12px;
      margin: 0 0 5px 0;
      line-height: 16px;
      word-break: break-word;
    }
    .footer {
      text-align: right;
      margin-top: 5px;
      font-size: 10px;
      display: flex;
      align-items: center;
      flex-direction: row-reverse;
    }
    .time {
      display: inline-block;
      margin-left: 7px;
      font-size: 12px;
      color: #7B87A5;
    }
    .message-body-wrapper { }
  `;

  @property({ type: Object }) declare message: ChatUIMessageModel<CombineMessageContent>;

  @state() private declare msgContent: CombineMessageContent;

  private i18n = new I18nController(this);

  private readonly weeklist: Array<keyof LanguagePackEntries> = [
    'time.format.sunday',
    'time.format.monday',
    'time.format.tueday',
    'time.format.wedday',
    'time.format.thurday',
    'time.format.friday',
    'time.format.satday',
  ];

  connectedCallback() {
    super.connectedCallback();
    // Copy content into msgContent so modal edits do not mutate the message list or affect forwarding.
    const content = this.msgContent = { ...this.message.content };
    // Listen for message deletion events.
    ctx().addEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);

    if (content.remoteUrl) {
      fetch(content.remoteUrl)
        .then(res => res.json())
        .then(data => {
          // Reassign msgContent to trigger a view update.
          this.msgContent = { ...content, msgList: data };
        });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    ctx().removeEventListener(ChatUIEvents.MESSAGES_DELETED, this._onDeleteMessages);
    ctx().audioPlayer.stop();
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

  private handleTimeFilter(time: number): string {
    const { year, month, day, weekDay } = formatTime(time)!;
    const interval: number = (Date.now() - time) / 1000 / 60 / 60 / 24;
    let name = this.i18n.t('time.format.full', year, month, day);
    if (new Date().toDateString() === new Date(time).toDateString()) {
      name = this.i18n.t('time.format.today');
    } else if ((new Date().toDateString() !== new Date(time).toDateString() && interval < 1) || (1 <= interval && interval < 2)) {
      name = this.i18n.t('time.format.yesterday');
    } else if (2 <= interval && interval < 7) {
      name = this.i18n.t(this.weeklist[weekDay] as keyof LanguagePackEntries);
    }
    return name;
  }

  private getMessageRenderList(): (ChatUIMessageModel<any> | string)[] {
    // Rebuild the message from msgContent, which may differ from the original content.
    const msg = Helper.createMessage(this.message.channelIdentifier, {
      content: this.msgContent,
      messageType: MessageType.COMBINE,
    }, this.message.senderUserId);
    const messages: Message[] = Helper.unwrapCombineMessage(msg);
    if (messages.length === 0) {
      return [];
    }

    const result: (ChatUIMessageModel<any> | string)[] = [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const model: ChatUIMessageModel<any> = new ChatUIMessageModel(messages[i]);
      result.unshift(model);
      if (model.messageType === MessageType.HD_VOICE) {
        // Combined forwarded messages need a generated messageId for playback.
        model.messageId = model.messageId || `${model.sentTime}`;
      }
      const before = messages[i - 1];
      if (before) {
        if (new Date(model.sentTime).toDateString() !== new Date(before.sentTime).toDateString()) {
          result.unshift(this.handleTimeFilter(model.sentTime));
        }
      } else {
        result.unshift(this.handleTimeFilter(model.sentTime));
      }
    }
    return result;
  }

  private getUserProfile(msg: ChatUIMessageModel<any>): ICacheUserProfile {
    return ctx().appData.getUserProfile(msg.senderUserId);
  }

  private getTitle(): string {
    const c = this.message.content;
    if (!c || !c.channelType || !c.nameList) return '';
    if (c.channelType === ChannelType.DIRECT) {
      return c.nameList.length === 2
        ? this.i18n.t('private.combine-msg.title', ...c.nameList)
        : this.i18n.t('private.combine-msg.signal.title', ...c.nameList);
    }
    return this.i18n.t('group.combine-msg.title');
  }

  private timeController(time: number): string {
    const { hour, minute } = formatTime(time)!;
    return `${hour}:${minute}`;
  }

  private handleBubbleClick(item: ChatUIMessageModel<any>) {
    switch (item.messageType) {
      case MessageType.IMAGE:
      case MessageType.SHORT_VIDEO: {
        ctx().emit(new ChatUIEvent(ChatUIEvents.MEDIA_MESSAGE_MODAL_EVENT, item));
        break;
      }
      case MessageType.COMBINE:
        ctx().emit(new ChatUIEvent(ChatUIEvents.COMBINE_MESSAGE_MODAL_EVENT, item));
        break;
      default:
        break;
    }
  }

  private handleFileDownload(message: ChatUIMessageModel<any>) {
    this.dispatchEvent(new CustomEvent('download', { bubbles: true, composed: true, detail: [message] }));
  }

  private handleLinkClick = (data: CustomEvent) => {
    const detail = data.detail as MessageLinckClick | MessageLinckClick[];
    const payload = Array.isArray(detail) ? detail[0] : detail;
    ctx().emit(new ChatUIEvent(ChatUIEvents.MESSAGE_LINK_CLICK, payload));
  };

  render() {
    const renderList = this.getMessageRenderList();
    const title = this.getTitle();

    return html`
      <div class="modal-combine-provider" @click=${this.handleCancel}>
        <div class="nc-chatui-combine-box" @click=${(e: Event) => e.stopPropagation()}>
          <div class="nc-imkit-combine-header">
            <div class="title">${title}</div>
            <span class="close" @click=${this.handleCancel}>x</span>
          </div>
          <div class="nc-imkit-combine-body">
            ${html`
              <nc-scrollbar-provider>
                <div style="padding: 10px 20px;">
                  ${renderList.map(item => {
                    if (typeof item === 'string') {
                      return html`<nc-message-time style="margin-bottom: 10px;" .time=${item}></nc-message-time>`;
                    }
                    const profile = this.getUserProfile(item);
                    const tag = unsafeStatic(getMessageComponentTag(item.messageType));
                    const handleDownload = () => this.handleFileDownload(item);
                    const handleLink = this.handleLinkClick;
                    return html`
                      <div class="nc-chatui-msg-list-item" style="flex-direction: row;">
                        <nc-icon class="nc-chatui-msg-avatar"
                          .url=${profile.avatarUrl}
                          width="32" height="32"
                          radius="50" .online=${false}></nc-icon>
                        <div class="nc-chatui-msg-bubble" @click=${() => this.handleBubbleClick(item)}>
                          <p class="name">${profile.name}</p>
                          <div class="message-body-wrapper">
                            ${staticHtml`<${tag} .message=${item} @download=${handleDownload} @link=${handleLink}></${tag}>`}
                          </div>
                          <div class="footer">
                            <span class="time">${this.timeController(item.sentTime)}</span>
                          </div>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </nc-scrollbar-provider>
            `}
          </div>
        </div>
      </div>
    `;
  }
}
