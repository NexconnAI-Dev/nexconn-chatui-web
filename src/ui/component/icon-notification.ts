import { LitElement, html, css } from 'lit';
import { NOTIFICATION_SVG } from '../../assets';

export class ChannelMutedIconElement extends LitElement {
  static styles = css`
    :host {
      margin-left: 5px;
      display: flex;
      align-items: center;
    }
  `;

  render() {
    return html`<img src="${NOTIFICATION_SVG}" alt="icon-notification">`;
  }
}
