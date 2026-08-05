import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { ConnectionStatus } from '@nexconn/chat';
import { I18nController } from '../i18n/lit';

export class ConnectionStatusElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .nc-chatui-connection-status {
      position: absolute;
      top: 70px;
      left: 0;
      right: 0;
      width: 100%;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
      animation: nc-status-fade-in 0.3s ease-in-out;
    }
    .nc-chatui-connection-status.is-error {
      background-color: #FFD5D5;
    }
    .nc-chatui-connection-status.is-warning {
      background-color: #E7EEFF;
    }
    .nc-chatui-connection-status-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .nc-chatui-connection-status-text {
      font-size: 16px;
      color: #020814;
      line-height: 20px;
    }
    .nc-connection-loading-icon {
      animation: nc-status-spin 1s linear infinite;
      flex-shrink: 0;
    }
    @keyframes nc-status-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes nc-status-fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  @property({ type: Boolean })
  declare visible: boolean;

  @property({ type: Number })
  declare status: ConnectionStatus;

  @property({ type: Number })
  declare code: number | undefined;

  private i18n = new I18nController(this);

  private get isConnecting(): boolean {
    return this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.SUSPENDED;
  }

  private get content(): string {
    switch (this.status) {
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.SUSPENDED:
        return this.i18n.t('connection.status.connecting');
      case ConnectionStatus.DISCONNECTED:
        return this.i18n.t('connection.status.disconnected');
      case ConnectionStatus.CONNECTED:
        return '';
      default:
        return '';
    }
  }

  private get statusClass(): string {
    return this.isConnecting ? 'is-warning' : 'is-error';
  }

  render() {
    if (!this.visible) return html``;
    return html`
      <div class="nc-chatui-connection-status ${this.statusClass}">
        <div class="nc-chatui-connection-status-content">
          ${this.isConnecting ? html`
            <svg class="nc-connection-loading-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
              <path d="M512 1024c-282.7776 0-512-229.2224-512-512s229.2224-512 512-512 512 229.2224 512 512-229.2224 512-512 512z m0-921.6c-225.8944 0-409.6 183.7056-409.6 409.6s183.7056 409.6 409.6 409.6 409.6-183.7056 409.6-409.6-183.7056-409.6-409.6-409.6z" fill="#0047FF" opacity="0.3"></path>
              <path d="M512 1024C229.2224 1024 0 794.7776 0 512c0-28.2624 22.9376-51.2 51.2-51.2s51.2 22.9376 51.2 51.2c0 225.8944 183.7056 409.6 409.6 409.6s409.6-183.7056 409.6-409.6c0-225.8944-183.7056-409.6-409.6-409.6-28.2624 0-51.2-22.9376-51.2-51.2s22.9376-51.2 51.2-51.2c282.7776 0 512 229.2224 512 512s-229.2224 512-512 512z" fill="#0047FF"></path>
            </svg>
          ` : ''}
          <span class="nc-chatui-connection-status-text">${this.content}</span>
        </div>
      </div>
    `;
  }
}
