import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { TRIANGLE_ICON } from '../../assets';

export class MessageLocationElement extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      right: 16px;
      background-color: #FFFFFF;
      border-radius: 20px;
    }
    :host(.top) {
      top: 30px;
    }
    :host(.bottom) {
      bottom: 30px;
    }
    div {
      font-size: 16px;
      line-height: 33px;
      text-align: center;
      width: 33px;
      height: 33px;
      border-radius: 50%;
      box-sizing: border-box;
      margin: 3px;
      overflow: hidden;
    }
    .count {
      color: #FFFFFF;
      background-color: #0099FF;
    }
    .forward-icon {
      border: 1px solid #0099FF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  @property({ type: Number })
  declare count: number;

  @property({ type: Number })
  declare direction: number;

  connectedCallback() {
    super.connectedCallback();
    this.updateHostClass();
  }

  updated() {
    this.updateHostClass();
  }

  private updateHostClass() {
    this.classList.toggle('top', this.direction === 0);
    this.classList.toggle('bottom', this.direction === 1);
  }

  private handleClick() {
    this.dispatchEvent(new CustomEvent('location', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      ${this.direction === 0 ? html`
        <div class="forward-icon" @click="${this.handleClick}">
          <img style="transform: rotate(180deg);" src="${TRIANGLE_ICON}" alt="TRIANGLE_ICON">
        </div>` : ''}
      <div class="count">${this.count}</div>
      ${this.direction === 1 ? html`
        <div class="forward-icon" @click="${this.handleClick}">
          <img src="${TRIANGLE_ICON}" alt="TRIANGLE_ICON">
        </div>` : ''}
    `;
  }
}
