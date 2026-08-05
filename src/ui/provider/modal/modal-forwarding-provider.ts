import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { SEARCH_ICON, CHECKED_ICON } from '../../../assets';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { I18nController } from '../../i18n/lit';
import { channelList } from '../context';
import { ChannelType } from '@nexconn/chat';

export class ModalForwardingProvider extends LitElement {
  static styles = css`
    :host { display: block; }
    input { border: 0; padding: 0; outline: none; }
    .modal-forwarding-provider .nc-chatui-modal-provider {
      background-color: #00000080;
    }
    .nc-chatui-modal-dialog-header {
      font-size: 18px;
      padding: 40px 0 20px 0;
      line-height: 20px;
      text-align: center;
      width: 500px;
      margin: 0 auto;
      flex-shrink: 0;
    }
    .nc-chatui-modal-dialog-content {
      padding: 0;
      flex: 1;
      flex-direction: column;
      overflow: hidden;
    }
    .nc-chatui-modal-dialog-content .search {
      font-size: 14px;
      margin: 0 20px 16px 20px;
      position: relative;
      flex-shrink: 0;
    }
    .search .search-input {
      padding: 8px 28px 8px 30px;
      border: 0.5px solid #E4E7ED;
      background-color: #FFFFFF;
      width: 100%;
      box-sizing: border-box;
      border-radius: 30px;
      font-size: 14px;
      color: #41464F;
    }
    .search .search-input::placeholder { color: #41464F; }
    .search .search-icon { position: absolute; top: 8px; left: 10px; }
    .list {
      min-height: 0;
      padding: 0 20px;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: #FFFFFF;
      font-size: 12px;
      height: 214px;
    }
    .list-item {
      display: flex;
      align-items: center;
      border-radius: 8px;
      margin: 0 0 10px 0;
      cursor: pointer;
      font: inherit;
      color: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    .list .channel {
      display: flex;
      align-items: center;
      overflow: hidden;
      min-width: 0;
    }
    .list .channel .profile { padding: 0 6px; flex-shrink: 0; }
    .list .channel .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      font-size: 14px;
      font-weight: 500;
      color: #41464F;
    }
    .list-item .checkbox { flex-shrink: 0; }
    .list-item .checkbox input[type="checkbox"] { display: none; }
    .list-item .checkbox .custom {
      display: flex;
      width: 14px;
      height: 14px;
      border: 1px solid #0000001A;
      border-radius: 50%;
      background-color: #FFFFFF;
      font-size: 0;
      justify-content: center;
      align-items: center;
    }
    .list-item .checkbox .custom img {
      opacity: 0;
    }
    .list-item .checkbox input[type="checkbox"]:checked + .custom {
      background-color: #16D258;
      border-color: #16D258;
    }
    .list-item .checkbox input[type="checkbox"]:checked + .custom img {
      opacity: 1;
    }
    .nc-chatui-modal-dialog-footer {
      display: flex;
      justify-content: center;
      padding: 30px 0 40px 0;
    }
    .nc-chatui-modal-dialog-footer button {
      min-width: 70px;
      text-decoration: none;
      border-radius: 4px;
      outline: none;
      font-size: 16px;
      border: 0;
      margin: 0 15px;
      cursor: pointer;
      width: 110px;
      height: 36px;
      background-color: #F3F5FA;
    }
    .nc-chatui-modal-dialog-footer .cancel { color: #020814; }
    .nc-chatui-modal-dialog-footer .confirm { color: #FFFFFF; background-color: #0047FF; }
    .nc-chatui-modal-dialog-footer .confirm:disabled { color: #CCCCCC; background-color: #F3F5FA; cursor: not-allowed; }
    .cancel:hover { background-color: #E3E7EF; }
    .confirm:hover:not(:disabled) { background-color: #366EFF; }
    @media (max-width: 768px) {
      .nc-chatui-modal-dialog-header { width: auto; padding-left: 20px; padding-right: 20px; }
      .search .search-input { width: 100%; max-width: 400px; }
    }
  `;

  @state() private declare search: string;
  @state() private declare checkedChannels: ChatUIChannelModel[];
  @state() private declare renderChannels: ChatUIChannelModel[];

  private i18n = new I18nController(this);
  private _debounceTimer: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.search = '';
    this.checkedChannels = [];
    this.renderChannels = channelList.value.filter(item => item.channelType !== ChannelType.SYSTEM);
  }

  private handleInputChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.search = val;
    if (!this._debounceTimer) {
      this._debounceTimer = setTimeout(() => {
        this.renderChannels = channelList.value.filter(item => item.name.includes(this.search));
        clearTimeout(this._debounceTimer);
        this._debounceTimer = null;
      }, 500);
    }
  }

  private handleCheckChange(item: ChatUIChannelModel, checked: boolean) {
    const itemKey = this.getChannelKey(item);
    if (checked) {
      if (this.checkedChannels.some(channel => this.getChannelKey(channel) === itemKey)) return;
      this.checkedChannels = [...this.checkedChannels, item];
    } else {
      this.checkedChannels = this.checkedChannels.filter(channel => this.getChannelKey(channel) !== itemKey);
    }
  }

  private getChannelKey(item: ChatUIChannelModel): string {
    return `${item.channelType}_${item.channelId}`;
  }

  private isChannelChecked(item: ChatUIChannelModel): boolean {
    const itemKey = this.getChannelKey(item);
    return this.checkedChannels.some(channel => this.getChannelKey(channel) === itemKey);
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }

  private handleConfirm() {
    if (this.checkedChannels.length === 0) return;
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true, detail: [{ list: this.checkedChannels }] }));
  }

  render() {
    return html`
      <div class="modal-forwarding-provider">
        <nc-modal-provider @click=${() => this.handleCancel()}>
          <nc-modal-dialog width="520" height="450">
            <div class="nc-chatui-modal-dialog-header" slot="header">${this.i18n.t('dialog.forwarding.msg')}</div>
            <div class="nc-chatui-modal-dialog-content" slot="content">
              <div class="search">
                <input class="search-input" .value=${this.search} type="text"
                  placeholder=${this.i18n.t('input.placeholder.search')}
                  @input=${(e: Event) => this.handleInputChange(e)}>
                <img class="search-icon" .src=${SEARCH_ICON} alt="SEARCH_ICON">
              </div>
              <div class="list">
                ${this.renderChannels?.map(item => html`
                  <label class="list-item">
                    <div class="checkbox">
                      <input type="checkbox"
                        .checked=${this.isChannelChecked(item)}
                        @change=${(e: Event) => this.handleCheckChange(item, (e.target as HTMLInputElement).checked)}>
                      <span class="custom">
                        <img .src=${CHECKED_ICON} alt="">
                      </span>
                    </div>
                    <div class="channel">
                      <nc-icon class="profile" width="32" height="32" radius="50" .url=${item.avatarUrl} .online=${false}></nc-icon>
                      <span class="name">${item.name}</span>
                    </div>
                  </label>
                `)}
              </div>
            </div>
            <div class="nc-chatui-modal-dialog-footer" slot="footer">
              <button class="cancel" @click=${() => this.handleCancel()}>${this.i18n.t('dialog.cancel.msg')}</button>
              <button class="confirm" ?disabled=${this.checkedChannels.length === 0} @click=${() => this.handleConfirm()}>
                ${this.i18n.t('dialog.forwarding.confirm')}
              </button>
            </div>
          </nc-modal-dialog>
        </nc-modal-provider>
      </div>
    `;
  }
}
