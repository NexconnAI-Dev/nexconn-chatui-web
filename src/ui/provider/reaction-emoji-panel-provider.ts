import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';

/** Shared emoji picker used by message reactions and the inline message editor. */
export class ReactionEmojiPanelProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 376px;
      max-width: 100%;
      height: 196px;
      max-height: 100%;
    }
    .reaction-panel {
      display: grid;
      grid-template-columns: repeat(auto-fill, 32px);
      grid-auto-rows: 32px;
      justify-content: center;
      align-content: start;
      gap: 4px;
      width: 100%;
      height: 100%;
      padding: 8px;
      overflow-y: auto;
      background-color: #fff;
      border-radius: 9px;
      box-shadow: 0 5px 16px #00000014;
      box-sizing: border-box;
    }
    .reaction-emoji-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 20px;
      background: transparent;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
    }
    .reaction-emoji-item:hover { background-color: #f2f3f5; }
  `;

  @property({ type: Array })
  declare emojis: string[];

  private selectEmoji(emoji: string) {
    this.dispatchEvent(new CustomEvent('emoji-select', {
      detail: emoji,
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="reaction-panel">
        ${(this.emojis || []).map(emoji => html`
          <button class="reaction-emoji-item" type="button" @click=${() => this.selectEmoji(emoji)}>${emoji}</button>
        `)}
      </div>
    `;
  }
}
