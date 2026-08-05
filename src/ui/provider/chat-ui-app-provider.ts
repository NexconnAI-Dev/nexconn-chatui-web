import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { openedChannel } from './context';
import { SignalController } from '../SignalController';
import { isMobileDevice } from '../../helper';

export class ChatUIAppProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .nc-chatui-app {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: row;
      position: relative;
    }
    .nc-chatui-app.is-h5 {
      flex-direction: column;
    }
    .detail {
      flex: 1 auto;
      overflow: hidden;
    }
    .list {
      border-right: 1px solid #E4E7ED;
    }
    .nc-chatui-app.is-h5 .list {
      border-right: none;
      border-bottom: 1px solid #E4E7ED;
      height: 100%;
    }
  `;

  @state() private declare isH5: boolean;

  private _signals = new SignalController(this, [openedChannel]);

  private checkDevice = () => {
    this.isH5 = isMobileDevice();
  };

  connectedCallback() {
    super.connectedCallback();
    this.checkDevice();
    window.addEventListener('resize', this.checkDevice);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.checkDevice);
  }

  render() {
    const opened = openedChannel.value !== null;
    return html`
      <div class="nc-chatui-app ${this.isH5 ? 'is-h5' : ''}">
        ${!this.isH5 || !opened ? html`<nc-channel-list-container-provider class="list"></nc-channel-list-container-provider>` : ''}
        ${!this.isH5 || opened ? html`<nc-channel-detail-provider class="detail"></nc-channel-detail-provider>` : ''}
      </div>
    `;
  }
}
