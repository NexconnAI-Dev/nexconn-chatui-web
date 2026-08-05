import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { multiChoiceMode, openedChannel, ctx, setEnvInfo, showChannelDetailBack } from './context';
import { SignalController } from '../SignalController';
import { ChannelType, ConnectionStatus } from '@nexconn/chat';
import { I18nController } from '../i18n/lit';
import { ConnectionStatusChangeEvent, InnerEvent } from '@lib/core/EventDefined';
import { ChatUICommand } from '@lib/enums/ChatUICommand';
import { isMobileDevice } from '../../helper';

export class ChannelDetailProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .nc-chatui-app-wrapper-right {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .nc-chatui-app-inner {
      width: 100%;
      height: 100%;
      min-width: 600px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .nc-chatui-app-wrapper-right.is-h5 .nc-chatui-app-inner {
      min-width: 350px;
    }
    .nc-chatui-msg-list {
      flex: 1 1 auto;
      overflow: hidden;
      background-color: #FFFFFF;
      position: relative;
    }
    .camera-screen {
      flex: 1 auto;
    }
  `;

  @state() private declare isH5: boolean;
  @state() private declare connectionStatus: ConnectionStatus;
  @state() private declare connectionCode: number | undefined;

  private i18n = new I18nController(this);
  private _signals = new SignalController(this, [openedChannel, multiChoiceMode, showChannelDetailBack]);
  private showConnectionStatus = ctx().store.getCommandSwitch(ChatUICommand.SHOW_CONNECTION_STATUS_IN_CHANNEL_LIST);

  private checkDevice = () => {
    this.isH5 = isMobileDevice();
  };

  private _onConnectionStatusChange = (e: ConnectionStatusChangeEvent) => {
    const { status, code } = e.data;
    this.connectionStatus = status;
    this.connectionCode = code;
  };

  connectedCallback() {
    super.connectedCallback();
    setEnvInfo();
    this.checkDevice();
    window.addEventListener('resize', this.checkDevice);
    this.connectionStatus = ctx().status;
    ctx().addEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, this._onConnectionStatusChange, this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.checkDevice);
    ctx().removeEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, this._onConnectionStatusChange, this);
  }

  render() {
    const opened = openedChannel.value;
    const isSystem = opened && opened.channelType === ChannelType.SYSTEM;
    const emptyDesc = this.i18n.t('channel.empty.desc');
    const multiChoice = multiChoiceMode.value;

    return html`
      <div class="nc-chatui-app-wrapper-right ${this.isH5 ? 'is-h5' : ''}">
        <div class="nc-chatui-app-inner">
          <nc-connection-status
            .visible=${this.showConnectionStatus && this.connectionStatus !== ConnectionStatus.CONNECTED}
            .status=${this.connectionStatus}
            .code=${this.connectionCode}
          ></nc-connection-status>
          ${!opened ? html`
            <nc-channel-empty style="width: 100%; height: 100%;" .desc=${emptyDesc}></nc-channel-empty>
          ` : html`
            <nc-channel-detail-bar-provider
              .model=${opened}
              .showBack=${showChannelDetailBack.value}
            ></nc-channel-detail-bar-provider>
            <nc-toast-provider></nc-toast-provider>
            <nc-message-list-provider class="nc-chatui-msg-list"></nc-message-list-provider>
            ${!multiChoice && !isSystem ? html`<nc-input-provider .model=${opened}></nc-input-provider>` : ''}
            ${multiChoice ? html`<nc-multi-choice-menu-provider></nc-multi-choice-menu-provider>` : ''}
          `}
        </div>
      </div>
    `;
  }
}
