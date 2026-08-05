import { LitElement, html, css, nothing } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { ChatUIEvent } from '../../core/ChatUIEvent';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { InputMenumItem, InputMenumID } from '../../modules/InputModule';
import { I18nController } from '../i18n/lit';
import {
  ctx, replyMessage,
  selectedGroupMembers, textarea, openedChannel,
} from './context';
import { LanguagePackEntries } from '../../languages';
import {
  hidePrompt, pickFiles, showAtList, showEmoji, insertChatEmoji, sendImageEmoji,
  onKeyDown, handleEnterOnKeyDown, onKeyUp, onPaste, showEmojiPanel, handleInput,
  handleAtAll, addMentionedUser, clearMentionedInfo,
  resetTextareaValue, resizeTextarea, sendMessage, secondaryVisible, adjustMessageListScroll,
  createReplyMessageInfo,
  ReplyMessageInfo,
} from './input-helper';
import { ChatUICommand } from '@lib/enums/ChatUICommand';
import { ChannelSelectedEvent, ChatUIEvents, InnerEvent, SetTextareaValueEvent, MessagesDeletedEvent } from '@lib/core/EventDefined';
import { isMobileDevice } from '@lib/helper';
import { INPUT_ICON_SEND_ICON, INPUT_ICON_SEND_ACTIVE_ICON } from '../../assets';
import { Unsubscribe } from '../signal';

export class InputProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-input-provider {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #fff;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
      padding: 0 12px;
      box-sizing: border-box;
    }
    .nc-input-emoji-panel,
    .nc-input-at-prompt {
      float: left;
      width: 100%;
      max-height: 248px;
      border-bottom: 1px solid #efefef;
      border-top: 1px solid #efefef;
    }
    .nc-input-top-buttons {
      width: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 8px 12px;
      gap: 8px;
      box-sizing: border-box;
    }
    .nc-input-menu-button {
      width: 30px;
      height: 30px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .nc-input-wrapper {
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid #E4E7ED;
      border-radius: 20px;
      margin: 0 0 12px 0;
      box-sizing: border-box;
      background-color: #fff;
      position: relative;
    }
    .nc-input-inner-wrapper {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      padding: 8px;
      gap: 8px;
      box-sizing: border-box;
    }
    .input-text-container {
      background: none;
      flex: 1;
      font-size: 14px;
      overflow: hidden;
      line-height: 21px;
      min-height: 21px;
      border: none;
      border-radius: 0;
      margin: 0;
      overflow-y: hidden;
      box-sizing: border-box;
    }
    .textarea {
      border: none;
      outline: none;
      background: none;
      min-height: 21px;
      height: 36px;
      max-height: calc(21px * 5);
      box-sizing: border-box;
      padding: 9px 10px;
      width: 100%;
      resize: none;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 21px;
      overflow-y: hidden;
      margin-top: 4px;
    }
    .textarea::-webkit-scrollbar { width: 4px; }
    .textarea::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
    .textarea::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    .textarea::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
    .textarea { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
    .hidden-dom {
      border: none;
      outline: none;
      background: none;
      line-height: 21px;
      min-height: 21px;
      height: 21px;
      overflow: scroll;
      box-sizing: border-box;
      padding: 0;
      width: 100%;
      resize: none;
      font-size: 14px;
      word-wrap: break-word;
      color: transparent;
      position: absolute;
      visibility: hidden;
    }
    .nc-input-send-button {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 5px 16px;
      border: none;
      border-radius: 30px;
      background-color: #ECF1FF;
      color: #0047FF;
      font-size: 14px;
      cursor: pointer;
      flex-shrink: 0;
      min-width: 60px;
      height: 28px;
      box-sizing: border-box;
      transition: background-color 0.2s, color 0.2s;
      margin: 8px 0;
    }
    .nc-input-send-button:hover:not(.disabled) { background-color: #D0DDFF; }
    .nc-input-send-button.disabled {
      background-color: #F3F5FA;
      color: #CCCCCC;
      cursor: not-allowed;
    }
    .nc-input-send-button img { width: 16px; height: 16px; flex-shrink: 0; }
    .replay-bar {
      width: 100%;
      padding: 8px 8px 0 8px;
      box-sizing: border-box;
    }
    .secondary-menu {
      position: absolute;
      min-width: 126px;
      background-color: #fff;
      border-radius: 9px;
      box-shadow: 0 0 4px 0 rgba(0,0,0,0.1);
      padding: 8px 4px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      font-size: 14px;
      color: #606060;
      z-index: 1000;
    }
    .secondary-menu-item {
      flex-direction: row;
      height: 36px;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      font-size: 12px;
      padding: 5px 6px;
      border-radius: 4px;
      cursor: pointer;
    }
    .secondary-menu-item:hover { background-color: #D2E1FE; }
    .secondary-menu-item img { width: 18px; height: 18px; margin-right: 10px; flex-shrink: 0; }
    .secondary-menu-item span { white-space: nowrap; }
    @media (max-width: 768px) {
      .nc-input-provider { padding: 0 8px; }
      .nc-input-top-buttons { padding: 8px 0; gap: 6px; }
      .nc-input-menu-button { width: 28px; height: 28px; }
      .nc-input-wrapper { margin: 0 0 8px 0; border-radius: 20px; }
      .nc-input-inner-wrapper { padding: 6px; gap: 6px; }
      .nc-input-send-button { min-width: 50px; font-size: 12px; }
      .nc-input-send-button span { display: none; }
    }
  `;

  @property({ type: Object }) declare model: ChatUIChannelModel;

  @query('.textarea') private declare textareaEl: HTMLTextAreaElement;
  @query('.hidden-dom') private declare hiddenDomEl: HTMLDivElement;
  @query('.input-text-container') private declare inputContainerEl: HTMLDivElement;
  @query('.nc-input-wrapper') private declare mainEl: HTMLDivElement;
  @query('.secondary-menu') private declare secondarDOMEl: HTMLDivElement;

  private i18n = new I18nController(this);

  @state() private declare isH5: boolean;
  @state() private declare hoveredButtonId: string | null;
  @state() private declare inputValue: string;
  @state() private declare secondaryMenuVisible: boolean;
  @state() private declare secondaryMenuItems: Array<InputMenumItem & { label: string }>;
  @state() private declare menuList: Array<InputMenumItem & { label: string }>;
  @state() private declare showEmojiPanel: boolean;
  @state() private declare showAtPanel: boolean;
  @state() private declare replyMsgInfo?: ReplyMessageInfo;

  private currentMenuButton: HTMLElement | null = null;
  private syncTimer: number | undefined;
  private unsubReplyMessage?: Unsubscribe;

  private get mentionAll(): boolean {
    return ctx().store.getCommandSwitch(ChatUICommand.MENTION_ALL);
  }

  public get inputMaxLength(): number {
    return ctx().input.inputMaxLength;
  }

  private filter = (item: InputMenumItem) => !item.filter || item.filter(this.model);
  private mapHandle = (item: InputMenumItem) => ({
    ...item,
    label: this.i18n.t(item.id as keyof LanguagePackEntries),
  });

  private get allTopButtons(): Array<InputMenumItem & { label: string }> {
    return [...this.menuList].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private get hasContent(): boolean {
    return this.inputValue.trim().length > 0 || textarea.value?.value?.trim().length > 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.isH5 = isMobileDevice();
    this.hoveredButtonId = null;
    this.inputValue = '';
    this.secondaryMenuVisible = false;
    this.secondaryMenuItems = [];
    this.showEmojiPanel = false;
    this.showAtPanel = false;
    this.replyMsgInfo = createReplyMessageInfo();
    this.unsubReplyMessage = replyMessage.subscribe(() => {
      this.replyMsgInfo = createReplyMessageInfo();
      this.onReplyMessageChange(this.replyMsgInfo);
    });

    const context = ctx();
    this.menuList = context.input.menuList.filter(this.filter).map(this.mapHandle);

    window.addEventListener('click', this.handleWindowClick);
    window.addEventListener('resize', this.handleWindowResize);

    context.addEventListener(ChatUIEvents.CHANNEL_SELECTED, this.handleChannelOpen);
    context.addEventListener(InnerEvent.SET_TEXTAREA_VALUE_EVENT, this.setTextareaValue);
    context.addEventListener(ChatUIEvents.MESSAGES_DELETED, this.handleMessagesDeleted);

    // Poll shared reactive state from input-helper.
    // TODO: Optimize this synchronization.
    this.syncTimer = window.setInterval(() => {
      const newShowEmoji = showEmoji.value;
      const newShowAt = showAtList.value;
      if (newShowEmoji !== this.showEmojiPanel) this.showEmojiPanel = newShowEmoji;
      if (newShowAt !== this.showAtPanel) this.showAtPanel = newShowAt;
      if (secondaryVisible.value !== this.secondaryMenuVisible) {
        this.secondaryMenuVisible = secondaryVisible.value;
      }
    }, 50);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubReplyMessage?.();
    window.clearInterval(this.syncTimer);
    window.removeEventListener('click', this.handleWindowClick);
    window.removeEventListener('resize', this.handleWindowResize);
    if (textarea.value) {
      textarea.value.removeEventListener('paste', onPaste);
    }
    const context = ctx();
    context.removeEventListener(ChatUIEvents.CHANNEL_SELECTED, this.handleChannelOpen);
    context.removeEventListener(InnerEvent.SET_TEXTAREA_VALUE_EVENT, this.setTextareaValue);
    context.removeEventListener(ChatUIEvents.MESSAGES_DELETED, this.handleMessagesDeleted);
  }

  protected firstUpdated() {
    // Store the textarea reference in shared context after the DOM is ready.
    textarea.value = this.textareaEl;
    textarea.value.addEventListener('paste', onPaste);

    const draft = openedChannel.value?.draft || '';
    textarea.value.value = draft;
    this.inputValue = draft;
  }

  private checkDevice() {
    this.isH5 = isMobileDevice();
    this.menuList = ctx().input.menuList.filter(this.filter).map(this.mapHandle);
  }

  private getButtonIcon(item: InputMenumItem): string {
    if (this.hoveredButtonId === item.id && item.hoverIcon) return item.hoverIcon;
    return item.icon;
  }

  private handleMenuClick(item: InputMenumItem, event: MouseEvent) {
    const isSecondaryMenuItem = this.secondaryMenuItems.some(m => m.id === item.id);
    if (isSecondaryMenuItem) {
      this.executeMenuItemAction(item, event);
      hidePrompt();
      this.secondaryMenuItems = [];
      this.currentMenuButton = null;
      return;
    }
    if (item.submenu && item.submenu.length > 0) {
      event.stopPropagation();
      const filteredSubmenu = item.submenu.filter(this.filter).map(this.mapHandle);
      if (filteredSubmenu.length > 0) {
        this.secondaryMenuItems = filteredSubmenu;
        this.currentMenuButton = event.currentTarget as HTMLElement;
        this.showSecondaryMenu(event);
      }
      return;
    }
    this.executeMenuItemAction(item, event);
  }

  private executeMenuItemAction(item: InputMenumItem, event: MouseEvent) {
    const context = ctx();
    switch (item.id) {
      case InputMenumID.PHOTO:
        context.emit(new ChatUIEvent(ChatUIEvents.TAKE_PHOTO_MODAL_EVENT));
        break;
      case InputMenumID.EMOJI:
        event.stopPropagation();
        showEmojiPanel();
        break;
      case InputMenumID.IMAGES:
        pickFiles('image/jpg, image/png, image/jpeg, image/gif', (files) => {
          context.message.sendImages(this.model.channelIdentifier, files)
        });
        break;
      case InputMenumID.FILES:
        pickFiles('*/*', (files) => {
          context.message.sendFiles(this.model.channelIdentifier, files)
        });
        break;
      default:
        context.emit(new ChatUIEvent(ChatUIEvents.INPUT_MENU_ITEM_CLICK, { id: item.id, channelModel: this.model }), 2);
        break;
    }
  }

  private showSecondaryMenu(event: MouseEvent) {
    secondaryVisible.value = true;
    this.secondaryMenuVisible = true;
    setTimeout(() => {
      if (!this.secondarDOMEl || !this.currentMenuButton || !this.mainEl) return;
      const buttonRect = this.currentMenuButton.getBoundingClientRect();
      const wrapperRect = this.mainEl.getBoundingClientRect();
      const buttonTop = buttonRect.top - wrapperRect.top;
      this.secondarDOMEl.style.bottom = `${wrapperRect.height - buttonTop + 8}px`;
      this.secondarDOMEl.style.left = `${buttonRect.left - wrapperRect.left}px`;
      this.secondarDOMEl.style.right = 'auto';
    }, 0);
  }

  private handleInsertChatEmoji(evt: CustomEvent) {
    if (textarea.value) {
      const currentLength = textarea.value.value.length;
      const selectedLength = textarea.value.selectionEnd - textarea.value.selectionStart;
      if (currentLength + evt.detail[0].length - selectedLength > this.inputMaxLength) {
        return;
      }
    }
    insertChatEmoji(evt, textarea.value);
    if (textarea.value) this.inputValue = textarea.value.value;
  }

  private handleInputWrapper(event: InputEvent) {
    if (textarea.value) this.inputValue = textarea.value.value;
    handleInput(textarea.value, this.hiddenDomEl, this.inputContainerEl, event);
    this.emitMessageInputEvent(ChatUIEvents.MESSAGE_INPUT_CHANGE);
  }

  private emitMessageInputEvent(type: ChatUIEvents.MESSAGE_INPUT_FOCUS | ChatUIEvents.MESSAGE_INPUT_BLUR | ChatUIEvents.MESSAGE_INPUT_CHANGE) {
    const data = { value: textarea.value?.value || '' };
    if (type === ChatUIEvents.MESSAGE_INPUT_FOCUS) {
      ctx().emit(new ChatUIEvent(ChatUIEvents.MESSAGE_INPUT_FOCUS, data), 2);
      return;
    }
    if (type === ChatUIEvents.MESSAGE_INPUT_BLUR) {
      ctx().emit(new ChatUIEvent(ChatUIEvents.MESSAGE_INPUT_BLUR, data), 2);
      return;
    }
    ctx().emit(new ChatUIEvent(ChatUIEvents.MESSAGE_INPUT_CHANGE, data), 2);
  }

  private sendMessageWrapper() {
    if (!textarea.value) return;
    const beforeValue = textarea.value.value;
    sendMessage(textarea.value, this.hiddenDomEl, this.inputContainerEl, this.mainEl);
    if (textarea.value.value === '' && beforeValue.trim().length > 0) {
      this.inputValue = '';
    }
  }

  private handleSendClick() {
    if (!this.hasContent || !textarea.value) return;
    this.sendMessageWrapper();
  }

  private handleKeyDown(e: KeyboardEvent) {
    const beforeValue = textarea.value?.value || '';
    onKeyDown(e);
    handleEnterOnKeyDown(e, this.hiddenDomEl, this.inputContainerEl, this.mainEl);
    if (e.key === 'Enter' && !e.shiftKey) {
      this.updateComplete.then(() => {
        if (textarea.value && textarea.value.value === '' && beforeValue.trim().length > 0) {
          this.inputValue = '';
        }
      });
    }
  }

  private handleAtUser(evt: CustomEvent<string>) {
    addMentionedUser(evt.detail, textarea.value);
  }

  private handleChannelOpen = async (evt: ChannelSelectedEvent) => {
    const channel = evt.data?.model;
    const focusInput = evt.data?.focusInput;
    const draft = channel?.draft || '';
    replyMessage.value = null;
    hidePrompt();
    clearMentionedInfo();
    resetTextareaValue(textarea.value, this.hiddenDomEl, this.inputContainerEl, this.mainEl, draft);
    this.inputValue = draft;
    if (channel && focusInput !== false) {
      textarea.value.focus();
    } else if (textarea.value) {
      textarea.value.blur();
    }
  };

  private setTextareaValue = (e: SetTextareaValueEvent) => {
    if (!e.data) return;
    textarea.value.focus();
    const length = textarea.value.value.length;
    textarea.value.setRangeText(e.data, length, length, 'end');
    this.inputValue = textarea.value.value;
    resizeTextarea(textarea.value, this.hiddenDomEl, this.inputContainerEl);
  };

  private onReplyMessageChange(val?: ReplyMessageInfo) {
    const context = ctx();
    if (val && context.store.getCommandSwitch(ChatUICommand.PROMPT_SENDER_WHEN_QUOTE_MESSAGE)) {
      addMentionedUser(val.senderUserId, textarea.value, true);
    }
    if (val && textarea.value) {
      textarea.value.focus();
    }
    adjustMessageListScroll();
  }

  private handleWindowClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (this.secondarDOMEl && this.secondarDOMEl.contains(target)) return;
    if (this.currentMenuButton && this.currentMenuButton.contains(target)) return;
    hidePrompt();
    this.secondaryMenuItems = [];
    this.currentMenuButton = null;
  };

  private handleWindowResize = () => {
    this.checkDevice();
    if (textarea.value && this.hiddenDomEl && this.inputContainerEl) {
      resizeTextarea(textarea.value, this.hiddenDomEl, this.inputContainerEl);
    }
  };

  private handleMessagesDeleted = (evt: MessagesDeletedEvent) => {
    if (!replyMessage.value) return;
    const isDeletedOrRecalled = evt.data.some(data => data.messageId === replyMessage.value?.messageId);
    if (isDeletedOrRecalled) {
      replyMessage.value = null;
    }
  };

  render() {
    const placeholder = this.i18n.t('input.placeholder');
    const sendLabel = this.i18n.t('input.send');

    return html`
      <div class="nc-input-provider">
        ${this.showEmojiPanel ? html`
          <nc-emoji-panel-provider class="nc-input-emoji-panel"
            @insert-chat=${(e: CustomEvent) => this.handleInsertChatEmoji(e)}
            @send-image=${(e: CustomEvent) => sendImageEmoji(e, this.model)}>
          </nc-emoji-panel-provider>
        ` : nothing}

        <nc-mention-users-panel-provider
          style="width: 100%; box-sizing: border-box; ${this.showAtPanel ? '' : 'display: none;'}"
          .mentionAll=${this.mentionAll}
          .members=${selectedGroupMembers.value}
          @mention=${(e: CustomEvent) => this.handleAtUser(e)}
          @mention-all=${() => handleAtAll(textarea.value)}>
        </nc-mention-users-panel-provider>

        <!-- Top button bar -->
        <div class="nc-input-top-buttons">
          ${this.allTopButtons.map(item => html`
            <img
              class="nc-input-menu-button"
              .src=${this.getButtonIcon(item)}
              .alt=${item.label}
              @mouseenter=${() => { this.hoveredButtonId = item.id; }}
              @mouseleave=${() => { this.hoveredButtonId = null; }}
              @click=${(e: MouseEvent) => { e.stopPropagation(); this.handleMenuClick(item, e); }}>
          `)}
        </div>

        <!-- Input container -->
        <div class="nc-input-wrapper">
          ${this.replyMsgInfo ? html`
            <nc-input-reply-bar class="replay-bar" .info=${this.replyMsgInfo}
              @cancel=${() => { replyMessage.value = null; }}>
            </nc-input-reply-bar>
          ` : nothing}

          <div class="nc-input-inner-wrapper">
            <div class="input-text-container">
              <textarea class="textarea"
                .placeholder=${this.isH5 ? '' : placeholder}
                .maxLength=${this.inputMaxLength}
                enterkeyhint=${this.isH5 ? 'send' : nothing as any}
                @keyup=${(e: KeyboardEvent) => onKeyUp(e)}
                @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
                @focus=${() => this.emitMessageInputEvent(ChatUIEvents.MESSAGE_INPUT_FOCUS)}
                @blur=${() => this.emitMessageInputEvent(ChatUIEvents.MESSAGE_INPUT_BLUR)}
                @input=${(e: InputEvent) => this.handleInputWrapper(e)}></textarea>
              <div class="hidden-dom" contenteditable></div>
            </div>

            <button
              class="nc-input-send-button ${this.hasContent ? '' : 'disabled'}"
              ?disabled=${!this.hasContent}
              @click=${() => this.handleSendClick()}>
              <img .src=${this.hasContent ? INPUT_ICON_SEND_ACTIVE_ICON : INPUT_ICON_SEND_ICON} alt="send" />
              ${!this.isH5 ? html`<span>${sendLabel}</span>` : nothing}
            </button>
          </div>

          <!-- Secondary menu -->
          <div class="secondary-menu" style="display: ${this.secondaryMenuVisible ? 'flex' : 'none'};"
            @click=${(e: MouseEvent) => e.stopPropagation()}>
            ${this.secondaryMenuItems.map(item => html`
              <div class="secondary-menu-item" @click=${(e: MouseEvent) => this.handleMenuClick(item, e)}>
                <img .src=${item.icon} alt="Icon"><span>${item.label}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}
