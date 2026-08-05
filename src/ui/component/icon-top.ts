import { LitElement, html, css } from 'lit';
import { TOP_ICON } from '../../assets';

export class PinnedIconElement extends LitElement {
  static styles = css`
    :host {
      margin-left: 5px;
      display: flex;
      align-items: center;
    }
  `;

  render() {
    return html`<img src="${TOP_ICON}" alt="icon-top">`;
  }
}
