import { LitElement, html, css } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { ReferenceMessageContent, TextMessageContent } from '@nexconn/chat';
import { ChatUIMessageEditStatus, ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { INPUT_ICON_EMOJI_ICON, INPUT_ICON_EMOJI_EDIT_HOVER_ICON } from '@lib/assets';
import { I18nController } from '../i18n/lit';
import { ctx } from './context';

interface MessageEditEmojiPanelToggleDetail {
  evt: MouseEvent;
  onSelect: (emoji: string) => void;
}

/** Inline message editor used by the message list for text and reference messages. */
export class MessageEditProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .editor {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 108px;
      min-width: 0;
      max-width: 100%;
      padding: 16px 18px 14px;
      border: 1px solid #e4e7ed;
      border-radius: 20px;
      background: #fff;
    }
    textarea {
      --edit-line-height: 22px;
      display: block;
      width: 100%;
      min-height: 36px;
      max-height: calc(var(--edit-line-height) * 10);
      box-sizing: border-box;
      resize: none;
      overflow-y: auto;
      scrollbar-gutter: stable;
      border: 0;
      outline: none;
      padding: 0 16px 0 0;
      color: #020814;
      background: transparent;
      font-family: inherit;
      font-size: 14px;
      line-height: var(--edit-line-height);
      white-space: pre-wrap;
    }
    .textarea-measure {
      position: absolute;
      top: 0;
      left: 0;
      height: 0;
      min-height: 0;
      max-height: none;
      overflow: hidden;
      scrollbar-gutter: auto;
      visibility: hidden;
      pointer-events: none;
    }
    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }
    button {
      box-sizing: border-box;
      display: flex;
      flex: 0 0 64px;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 30px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      line-height: 30px;
    }
    .emoji-button {
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      padding: 0;
      font-size: 16px;
      border-radius: 8px;
      background: transparent;
    }
    .emoji-button:hover { background: transparent; }
    .emoji-button img { display: block; width: 30px; height: 30px; }
    .emoji-button .emoji-hover { display: none; }
    .emoji-button:hover .emoji-regular { display: none; }
    .emoji-button:hover .emoji-hover { display: block; }
    button { padding: 0; background: #f3f5fa; color: #020814; }
    button.confirm { color: #fff; background: #0047ff; }
    button:disabled { cursor: default; opacity: .5; }
    .emoji-action { position: relative; flex: 0 0 30px; width: 30px; height: 30px; }
  `;

  @property({ type: Object }) declare message: ChatUIMessageModel;
  @state() private declare draft: string;
  @query('textarea:not(.textarea-measure)') private declare textarea: HTMLTextAreaElement;
  @query('.textarea-measure') private declare textareaMeasure: HTMLTextAreaElement;
  private i18n = new I18nController(this);

  private get inputMaxLength(): number {
    return ctx().input.inputMaxLength;
  }

  connectedCallback() {
    super.connectedCallback();
    this.draft = this.message?.editDraft ?? this.getMessageText();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('message') && this.message && this.message.editDraft !== undefined) {
      this.draft = this.message.editDraft;
    }
  }

  private getMessageText(): string {
    if (!this.message) return '';
    return (this.message.content as TextMessageContent | ReferenceMessageContent).text || '';
  }

  private emitDraft() {
    this.dispatchEvent(new CustomEvent('draft-change', {
      detail: this.draft,
      bubbles: true,
      composed: true,
    }));
  }

  private onInput(event: Event) {
    this.draft = (event.target as HTMLTextAreaElement).value;
    this.emitDraft();
    this.resizeTextarea();
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    this.confirm();
  }

  private resizeTextarea(preserveBottom = true) {
    if (!this.textarea || !this.textareaMeasure) return;
    const previousBottom = this.getBoundingClientRect().bottom;
    // Measure outside normal flow. Shrinking the live textarea to `auto`
    // clamps the list's scrollTop, even when its final height stays the same.
    this.textareaMeasure.style.width = `${this.textarea.clientWidth}px`;
    this.textareaMeasure.value = this.textarea.value;
    const contentHeight = this.textareaMeasure.scrollHeight;
    this.textarea.style.height = `${Math.min(Math.max(contentHeight, 44), 220)}px`;
    this.textarea.style.overflowY = contentHeight > 220 ? 'auto' : 'hidden';

    if (!preserveBottom || Math.abs(this.getBoundingClientRect().bottom - previousBottom) < 0.5) return;
    this.dispatchEvent(new CustomEvent('edit-resize', {
      detail: { previousBottom },
      bubbles: true,
      composed: true,
    }));
  }

  private insertEmoji(value: string) {
    if (!value) return;
    const start = this.textarea?.selectionStart ?? this.draft.length;
    const end = this.textarea?.selectionEnd ?? start;
    if (this.draft.length - (end - start) + value.length > this.inputMaxLength) return;
    this.draft = `${this.draft.slice(0, start)}${value}${this.draft.slice(end)}`;
    this.emitDraft();
    void this.updateComplete.then(() => {
      this.resizeTextarea();
      this.textarea?.focus();
      const cursor = start + value.length;
      this.textarea?.setSelectionRange(cursor, cursor);
    });
  }

  protected firstUpdated() {
    this.resizeTextarea(false);
    this.textarea.focus({ preventScroll: true });
    const end = this.textarea.value.length;
    this.textarea.setSelectionRange(end, end);
    this.textarea.scrollTop = this.textarea.scrollHeight;
  }

  private confirm() {
    if (!this.draft.trim() || this.message?.editStatus === ChatUIMessageEditStatus.UPDATING) return;
    this.dispatchEvent(new CustomEvent('confirm', { detail: this.draft, bubbles: true, composed: true }));
  }

  render() {
    const updating = this.message?.editStatus === ChatUIMessageEditStatus.UPDATING;
    return html`
      <div class="editor">
        <textarea
          rows="2"
          .value=${this.draft || ''}
          .maxLength=${this.inputMaxLength}
          @input=${this.onInput}
          @keydown=${this.onKeyDown}
        ></textarea>
        <textarea class="textarea-measure" tabindex="-1" aria-hidden="true" readonly></textarea>
        <div class="actions">
          <div class="emoji-action">
            <button class="emoji-button" type="button" aria-label="Emoji" @click=${(event: MouseEvent) => {
              event.stopPropagation();
              this.dispatchEvent(new CustomEvent<MessageEditEmojiPanelToggleDetail>('emoji-panel-toggle', {
                detail: { evt: event, onSelect: (emoji: string) => this.insertEmoji(emoji) },
                bubbles: true,
                composed: true,
              }));
            }}>
              <img class="emoji-regular" src=${INPUT_ICON_EMOJI_ICON} alt="">
              <img class="emoji-hover" src=${INPUT_ICON_EMOJI_EDIT_HOVER_ICON} alt="">
            </button>
          </div>
          <button type="button" @click=${() => this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))}>
            ${this.i18n.t('message.edit.cancel')}
          </button>
          <button class="confirm" type="button" ?disabled=${updating || !this.draft.trim()} @click=${this.confirm}>
            ${this.i18n.t('message.edit.confirm')}
          </button>
        </div>
      </div>
    `;
  }
}
