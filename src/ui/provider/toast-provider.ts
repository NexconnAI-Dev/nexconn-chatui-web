import { LitElement, html, css } from 'lit';
import { ChatUIEvents } from '@lib/core/EventDefined';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ctx } from './context';

export interface ToastEventData {
  message: string;
  showIcon?: boolean;
}

export class ToastProvider extends LitElement {
  static styles = css`
    .nc-chatui-toast {
      position: absolute;
      top: 70px;
      left: 0;
      right: 0;
      width: 100%;
      height: 46px;
      background-color: #C9F5D8;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      animation: toast-in 0.3s ease-in;
    }
    .nc-chatui-toast.hiding {
      animation: toast-out 0.3s ease-out forwards;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes toast-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-10px); }
    }
    .nc-chatui-toast-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .nc-chatui-toast-text {
      font-size: 16px;
      color: #020814;
      line-height: 20px;
    }
  `;

  private _visible = false;
  private _hiding = false;
  private _message = '';
  private _showIcon = true;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  private _onToastEvent = (e: ChatUIEvent<'TOAST_EVENT', ToastEventData>) => {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._message = e.data.message;
    this._showIcon = e.data.showIcon !== false;
    this._hiding = false;
    this._visible = true;
    this.requestUpdate();

    this._timer = setTimeout(() => {
      this._hiding = true;
      this.requestUpdate();
      // Hide after the animation finishes.
      setTimeout(() => {
        this._visible = false;
        this._hiding = false;
        this._timer = null;
        this.requestUpdate();
      }, 300);
    }, 3000);
  };

  connectedCallback() {
    super.connectedCallback();
    ctx().addEventListener(ChatUIEvents.TOAST_EVENT, this._onToastEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) clearTimeout(this._timer);
    ctx().removeEventListener(ChatUIEvents.TOAST_EVENT, this._onToastEvent);
  }

  render() {
    if (!this._visible) return html``;
    return html`
      <div class="nc-chatui-toast ${this._hiding ? 'hiding' : ''}">
        <div class="nc-chatui-toast-content">
          ${this._showIcon ? html`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#46DB7A"/>
              <path d="M7.24951 13.2507L10.2495 16.2507L17.2495 9.25073" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          ` : ''}
          <span class="nc-chatui-toast-text">${this._message}</span>
        </div>
      </div>
    `;
  }
}
