import { ILogger, PluginContext } from '@nexconn/engine';
import {
  ConnectionStatusHandler, NCEngine, ConnectionStatus,
} from '@nexconn/chat';

import { EventDispatcher } from './EventDispatcher';
import { ChatUIStore } from '../modules/ChatUIStore';
import { ChannelStore } from '../modules/ChannelStore';
import { AppDataModule } from '../modules/appdata/AppDataModule';
import { ChatUIInitParams } from './NCChatUIApplication'
import { I18nModule } from '../modules/I18nModule';
import { ChatUIEvent } from './ChatUIEvent';
import { MessageModule } from '../modules/MessageDataModule';
import { InputModule } from '../modules/InputModule';
import { BubbleModule } from '../modules/BubbleModule';
import { ChannelsMenu } from '../modules/ChannelsMenu';
import { MessageMenu } from '../modules/MessageMenu';
import { LanguagePackEntries } from '../languages';
import { AudioPlayer } from '../modules/AudioPlayer';
import { SpeechToTextStore } from '../modules/SpeechToTextStore';
import { ConfirmEvent, ConnectionStatusChangeEvent, EventDefined, InnerEvent, ChatUIEvents } from './EventDefined';
import { ChannelDataModule } from '@lib/modules/conversation/ConversationDataModule';
import { ChannelsItemModule } from '@lib/modules/conversation/ConversationItemModule';

/**
 * Application context bus.
 * @emits
 * - ChatUIEvents.CONNECTION_STATUS_CHANGE - Connection status changes
 * - ChatUIEvents.USER_CHANGED - User changes; UI and data modules use this to decide whether to clear caches
 */
export class ChatUIContext extends EventDispatcher<EventDefined> {
  public readonly store: ChatUIStore;

  public channelStore: ChannelStore | null = null;

  public readonly i18n: I18nModule;

  public readonly appData: AppDataModule;

  public readonly message: MessageModule;

  public readonly channelModule: ChannelDataModule;

  public readonly channelItem: ChannelsItemModule;

  public readonly input: InputModule;

  public readonly bubble: BubbleModule;

  /** Audio playback module */
  public readonly audioPlayer: AudioPlayer;

  /**
   * Channel menu module
   */
  public readonly channelsMenu: ChannelsMenu;

  public readonly msgMenu: MessageMenu;

  /** Speech-to-text module */
  public readonly speechToTextStore: SpeechToTextStore;

  /** Original user ID, used to detect account changes after reconnecting. */
  private _originUserId: string = '';

  public isReadReceiptV5: boolean = true;

  /** Current user ID */
  public get userId(): string {
    return this._originUserId;
  }

  /** Current connection status */
  private _status: ConnectionStatus = ConnectionStatus.DISCONNECTED;

  /**
   * Whether the app runs on the Electron IMLib engine
   */
  public readonly isElectronRuntime = false;

  /**
   * IM connection status
   */
  public get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * Modal container defined by the application
   */
  public readonly modalContainerId: string = ''

  /**
   * Message recall window in seconds
   */
  public readonly allowedToRecallTime: number;

  /**
   * Re-edit window for recalled messages in seconds
   */
  public readonly allowedToReEditTime: number;

  constructor(
    private context: PluginContext,
    public readonly logger: ILogger,
    /**
     * Application event dispatcher
     */
    private readonly _emittor: EventDispatcher<EventDefined>,
    _opts: ChatUIInitParams,
  ) {
    super();

    this.modalContainerId = _opts.modalContainerId || '';
    this.allowedToRecallTime = _opts.allowedToRecallTime || 120;
    this.allowedToReEditTime = _opts.allowedToReEditTime || 60;

    this.store = new ChatUIStore(logger);

    // Initialize UI-independent modules.
    this.i18n = new I18nModule(this);
    this.audioPlayer = new AudioPlayer(this);
    this.appData = new AppDataModule(this, _opts.hooks);
    this.message = new MessageModule(this);
    this.channelModule = new ChannelDataModule(this);
    this.channelItem = new ChannelsItemModule(this);
    this.input = new InputModule(this);
    this.bubble = new BubbleModule(this);
    this.channelsMenu = new ChannelsMenu(this);
    this.msgMenu = new MessageMenu(this);
    this.speechToTextStore = new SpeechToTextStore(logger, this);
    this.msgMenu.setSpeechToTextStore(this.speechToTextStore);

    // Set the default language.
    if(_opts.language) {
      this.i18n.setLanguage(_opts.language);
    }

    const _this = this;
    NCEngine.addConnectionStatusHandler('ui-context-connection-status-handler', new ConnectionStatusHandler({
      onConnectionStatusChanged(event) {
        switch (event.status) {
          case ConnectionStatus.CONNECTING:
            _this._onConnecting();
            break;
          case ConnectionStatus.DISCONNECTED:
            _this._onDisconnected(event.code!);
            break;
          case ConnectionStatus.SUSPENDED:
            _this._onSuspend(event.code!);
            break;
          case ConnectionStatus.CONNECTED:
            _this._onConnected();
            break;
        }
      },
    }));
  }

  private _onConnecting() {
    this._status = ConnectionStatus.CONNECTING;
    this.dispatchEvent(new ConnectionStatusChangeEvent(ConnectionStatus.CONNECTING));
  }

  private _onDisconnected(code: number) {
    this._status = ConnectionStatus.DISCONNECTED;
    this.dispatchEvent(new ConnectionStatusChangeEvent(ConnectionStatus.DISCONNECTED, code));
  }

  private _onSuspend(code: number) {
    this._status = ConnectionStatus.SUSPENDED;
    this.dispatchEvent(new ConnectionStatusChangeEvent(ConnectionStatus.SUSPENDED, code));
  }

  private _onConnected() {
    this._status = ConnectionStatus.CONNECTED;

    // A different user ID after reconnecting indicates an account change.
    const newUserId = NCEngine.getCurrentUserId();

    if (this._originUserId === newUserId) {
      // A matching user ID means the account did not change.
      this.dispatchEvent(new ConnectionStatusChangeEvent(ConnectionStatus.CONNECTED));
      return;
    }

    if (this._originUserId && this._originUserId !== newUserId) {
      // Clear UI and data caches when reconnecting with a different user.
      // Do not clear on disconnect, to avoid a long data rebuild after signing in again.
      this._originUserId = newUserId;
      this.dispatchEvent(new ChatUIEvent(InnerEvent.DESTROY_USER_CACHE), false);
    }

    // First connection.
    this._originUserId = newUserId;
    // Notify UI and data modules to build their caches.
    this.dispatchEvent(new ChatUIEvent(InnerEvent.INIT_USER_CACHE), false);

    this.dispatchEvent(new ConnectionStatusChangeEvent(ConnectionStatus.CONNECTED));

    this.channelStore = new ChannelStore(window, this.getAppkey(), this.userId);
  }

  public destroy() {
    NCEngine.removeConnectionStatusHandler('ui-context-connection-status-handler');

    this.i18n.destroy();
    this.appData.destroy();
    this.message.destroy();
    this.channelModule.destroy();
    this.input.destroy();
    this.bubble.destroy();
    this.channelsMenu.destroy();
    this.msgMenu.destroy();
    this.speechToTextStore.destroy();

    this._originUserId = '';
  }

  /**
   * Show an alert.
   * @param msgkey - Language pack entry key
   */
  public alert(msgkey: keyof LanguagePackEntries, ...args: Array<string | number>): void {
    this.emit(new ChatUIEvent(ChatUIEvents.ALERT_EVENT, this.i18n.format(msgkey, ...args)));
  }

  /**
   * Show a confirmation dialog and wait for the user's choice.
   * @param msgkey - Language pack entry key
   * @returns
   */
  public confirm(msgkey: keyof LanguagePackEntries, ...args:  Array<string | number>): Promise<boolean> {
    const evt: ConfirmEvent = new ChatUIEvent(ChatUIEvents.CONFIRM_EVENT, this.i18n.format(msgkey, ...args));
    this.emit(evt);
    return evt.awaitResult();
  }

  /**
   * Emit an event. Use `dispatchEvent` when the event should remain internal.
   * @param event - Event
   * @param mode - Dispatch mode; defaults to 0
   * - 0. Dispatch to the application first; stop internal dispatch if the application prevents the default behavior
   * - 1. Dispatch to both the application and SDK internals, ignoring application interception and results
   * - 2. Dispatch only to the application
   */
  emit<K extends keyof EventDefined>(event: EventDefined[K], mode: 0 | 1 | 2 = 0): void {
    // Clone events dispatched to the application.
    const tmpEvent = event.clone();
    // Run listeners immediately so `event.isDefaultPrevented()` has the correct value.
    this._emittor.dispatchEvent(tmpEvent, false);

    if (mode === 2 || (mode === 0 && tmpEvent.isDefaultPrevented())) {
      // Stop internal dispatch when the application intercepts the event.
      return;
    }

    // Dispatch the original event within the SDK.
    this.dispatchEvent(event);
  }

  /**
   * Get the current app key.
   * @returns
   */
  getAppkey() {
    return this.context.getAppkey();
  }
}
