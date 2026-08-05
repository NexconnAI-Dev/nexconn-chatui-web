import { LitElement, html, css } from 'lit';
import { ctx } from './context';
import { ImageEmojiLibrary, ImageEmoji } from '../../modules/InputModule';

export class EmojiPanelProvider extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    .menu-list {
      height: 48px;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 0 8px;
    }
    .menu-button {
      width: 32px;
      height: 32px;
      cursor: pointer;
      border-radius: 5px;
      margin-left: 10px;
    }
    .menu-button.selected {
      background-color: #e9f0fb;
    }
    .menu-button img {
      width: 28px;
      height: 28px;
      margin: 2px;
    }
    .emoji-list {
      flex: 1;
      overflow: auto;
      padding: 4px 8px;
    }
    .chat-emoji-item {
      display: inline-block;
      font-size: 22px;
      width: 30px;
      height: 30px;
      cursor: pointer;
      text-align: center;
      line-height: 30px;
      border-radius: 4px;
    }
    .chat-emoji-item:hover, .image-emoji-item:hover {
      background-color: #e9f0fb;
    }
    .image-emoji-item {
      display: inline-block;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
    }
  `;

  private _selected = 0;
  private _libraries: ImageEmojiLibrary[] = [];
  private _chats = ctx().input.cloneChatEmojiLibrary();

  connectedCallback() {
    super.connectedCallback();
    this._libraries = ctx().input.cloneImageEmojiLibraries();
    this.requestUpdate();
  }

  private get _menu() {
    return [{ icon: this._chats.icon, index: 0 }].concat(
      ...this._libraries.map((item, index) => ({ icon: item.icon, index: index + 1 }))
    );
  }

  private get _images(): Array<ImageEmoji & { width: number; height: number }> {
    if (this._selected === 0) return [];
    const library = this._libraries[this._selected - 1];
    const { itemWidth, itemHeight, items } = library;
    return items.map(item => ({ ...item, width: itemWidth, height: itemHeight }));
  }

  private _selectMenu(index: number) {
    this._selected = index;
    this.requestUpdate();
  }

  render() {
    return html`
      <div @click=${(e: Event) => e.stopPropagation()}>
        <div class="menu-list">
          ${this._menu.map(item => html`
            <div class="menu-button ${item.index === this._selected ? 'selected' : ''}" @click=${() => this._selectMenu(item.index)}>
              <img src="${item.icon}" alt="Emoji"/>
            </div>
          `)}
        </div>
        <div class="emoji-list">
          ${this._selected === 0 ? this._chats.chats.map(item => html`
            <div class="chat-emoji-item" @click=${() => this.dispatchEvent(new CustomEvent('insert-chat', { detail: item, bubbles: true, composed: true }))}>
              <span>${item}</span>
            </div>
          `) : ''}
          ${this._selected > 0 ? this._images.map(item => html`
            <div class="image-emoji-item"
              style="width: ${item.width}px; height: ${item.height}px;"
              @click=${() => this.dispatchEvent(new CustomEvent('send-image', { detail: item, bubbles: true, composed: true }))}>
              <img src="${item.imageThumbnail?.thumbnail}" width="${item.width}" height="${item.height}" alt="Emoji"/>
            </div>
          `) : ''}
        </div>
      </div>
    `;
  }
}
