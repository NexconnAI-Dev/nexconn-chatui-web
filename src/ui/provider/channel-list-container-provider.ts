import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { setEnvInfo, showChannelBar, channelBarTitle } from './context';
import { SignalController } from '../SignalController';
import { isMobileDevice } from '../../helper';
import { I18nController } from '../i18n/lit';

export class ChannelListContainerProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .nc-chatui-app-wrapper-left {
      min-width: 312px;
      width: 312px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .nc-chatui-app-wrapper-left.is-h5 {
      min-width: 0;
      width: 100%;
    }
    .bar-content {
      width: 100%;
      height: 68px;
      display: flex;
      flex-direction: row;
      align-items: center;
      position: relative;
      z-index: 2;
      background-color: #fff;
      border-bottom: 1px solid #efefef;
    }
    .bar-title {
      font-size: 16px;
      font-weight: 500;
      color: #000;
      margin: 0 20px;
    }
    .nc-chatui-app-conv {
      flex: auto;
      overflow: hidden;
    }
  `;

  @state() private declare isH5: boolean;

  private i18n = new I18nController(this);
  private _signals = new SignalController(this, [showChannelBar, channelBarTitle]);

  private checkDevice = () => {
    this.isH5 = isMobileDevice();
  };

  connectedCallback() {
    super.connectedCallback();
    setEnvInfo();
    this.checkDevice();
    window.addEventListener('resize', this.checkDevice);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.checkDevice);
  }

  render() {
    const shouldShowBar = showChannelBar.value;
    const title = channelBarTitle.value || this.i18n.t('channel.list.bar.title');
    return html`
      <div class="nc-chatui-app-wrapper-left ${this.isH5 ? 'is-h5' : ''}">
        ${this.isH5 && shouldShowBar ? html`
          <div class="nc-chatui-app-conv-bar">
            <div class="bar-content">
              <span class="bar-title">${title}</span>
            </div>
          </div>
        ` : ''}
        <div class="nc-chatui-app-conv">
          <nc-channel-list-provider></nc-channel-list-provider>
        </div>
      </div>
    `;
  }
}
