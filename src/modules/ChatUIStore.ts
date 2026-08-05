import { ILogger } from '@nexconn/engine';
import { ChatUICommand } from '../enums/ChatUICommand';
import { LogTag } from '../enums/LogTag';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { PushConfig } from '@nexconn/chat';

/**
 * Channel panel extension configuration
 * @description Defines a custom button/feature in the channel detail panel header
 * @example
 * ```typescript
 * const extension: ChannelPanelExtension = {
 *   id: 'video-call',
 *   icon: 'https://example.com/video-icon.svg',
 *   filter: (model) => model.channelType === ChannelType.PRIVATE
 * };
 * ```
 */
export type ChannelPanelExtension = {
  /**
   * Extension ID, defined by the application
   */
  id: string,
  /**
   * Icon URL for the extension button
   */
  icon: string,
  /**
   * Filter function to control which channels show this extension
   * @param model - Channel model
   * @returns true to show, false to hide. Defaults to showing on all channels if not provided.
   */
  filter?: (model: ChatUIChannelModel) => boolean
};

/**
 * Push notification configuration hook
 * @description Function to customize push notification content before sending a message
 * @param message - The message being sent
 * @returns Push configuration object
 * @example
 * ```typescript
 * const hook: PushConfigHook = (message) => ({
 *   pushTitle: `New message from ${message.senderUserId}`,
 *   pushContent: message.content?.text || '[Message]',
 *   pushData: JSON.stringify({ messageId: message.messageId })
 * });
 * ```
 */
export type PushConfigHook = (message: ChatUIMessageModel) => PushConfig;

export class ChatUIStore {
  private _commands: Map<ChatUICommand, boolean> = new Map();
  /**
   * Channel bar title. On H5, it can only be set while the channel bar is enabled.
   */
  private _channelBarTitle?: string | undefined;
    /**
   * Whether to show the channel bar. Only applies to H5.
   * * true - Show (default)
   * * false - Hide
   */
  private _channelBarSwitch: boolean = true;
  /**
   * Whether to show the channel detail back button. Only applies to H5.
   * * true - Show (default)
   * * false - Hide
   */
  private _channelDetailBackSwitch: boolean = true;

  constructor(
    private readonly logger: ILogger,
  ) {
    this._init();
  }

  private _init(): void {
    // Define default feature flags.
    this._commands.set(ChatUICommand.SHOW_CONNECTION_STATUS_IN_CHANNEL_LIST, true);
    this._commands.set(ChatUICommand.SHOW_MESSAGE_STATE, true);
    this._commands.set(ChatUICommand.MENTION_ALL, true);
    this._commands.set(ChatUICommand.PROMPT_SENDER_WHEN_QUOTE_MESSAGE, false);
    this._commands.set(ChatUICommand.DELETE_MESSAGES_WHILE_DELETE_CHANNEL, false);
  }

  /**
   * Update a feature flag.
   * @param command
   * @param enable
   */
  setCommandSwitch(command: ChatUICommand, enable: boolean): void {
    this.logger.info(LogTag.A_SET_COMMAND_SWITCH_O, `command: ${command}, enable: ${!!enable}`);
    this._commands.set(command, !!enable);
  }

  getCommandSwitch(command: ChatUICommand): boolean {
    return !!this._commands.get(command);
  }

  /**
   * Set the channel bar title.
   * @param value Title text.
   */
  setChannelBarTitle(value?: string): void {
    // The title cannot be set while the channel bar is disabled.
    if (!this._channelBarSwitch) {
      return;
    }

    this._channelBarTitle = value;
  }
  /**
   * Enable or disable the channel bar.
   * @param enable Whether to enable it.
   */
  setChannelBarSwitch(enable: boolean): void {
    this._channelBarSwitch = enable;
  }

  /**
   * Enable or disable the channel detail back button.
   * @param enable Whether to enable it.
   */
  setChannelDetailBackSwitch(enable: boolean): void {
    this._channelDetailBackSwitch = enable;
  }
  /**
   * Get whether the channel bar is enabled.
   * @returns Whether it is enabled.
   */
  getChannelBarSwitch(): boolean {
    return this._channelBarSwitch;
  }
  /**
   * Get whether the channel detail back button is enabled.
   * @returns Whether it is enabled.
   */
  getChannelDetailBackSwitch(): boolean {
    return this._channelDetailBackSwitch;
  }

  /**
   * Get the channel bar title.
   * @returns Title text.
   */
  getChannelBarTitle(): string | undefined {
    return this._channelBarTitle;
  }

  getChannelPanelExtension(): ChannelPanelExtension[] {
    return this._extensions;
  }

  private _extensions: ChannelPanelExtension[] = [];

  /**
   * Add an extension to the channel title bar.
   */
  setChannelPanelExtensions(extensions: ChannelPanelExtension[]): void {
    this._extensions.splice(0, this._extensions.length, ...extensions);
  }

  private _pushConfigHook?: PushConfigHook;
  setPushConfigHook(hook: PushConfigHook): void {
    this._pushConfigHook = hook;
  }

  getPushConfig(message: ChatUIMessageModel): PushConfig | undefined {
    if (!this._pushConfigHook) {
      return;
    }

    let conf: PushConfig | undefined;
    try {
      conf = this._pushConfigHook(message.clone());
    } catch (error: any) {
      console.error('getPushConfigHook error: ', error);
    }
    return conf;
  }

  destroy(): void {
    this._commands.clear();
  }
}
