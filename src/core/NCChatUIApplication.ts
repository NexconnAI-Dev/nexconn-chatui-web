import {
  ILogger, IPluginGenerator, PluginContext,
} from '@nexconn/engine';
import { ChatUICommand } from '../enums/ChatUICommand';

import { ChatUIContext } from './ChatUIContext';
import { EventDispatcher } from './EventDispatcher';
import { ChatUICustomMessageRegistration, UIModule } from '../ui';
import { LogTag } from '../enums/LogTag';
import { LanguagePackEntries, LanguageDirection } from '../languages';
import { ServiceHooks } from '../modules/appdata/AppDataModule';
import { ChatUIChannelModel } from '../models/NCUIChannelModel';
import { ChatUIEmojiLibrary, ImageEmojiLibrary, InputMenu } from '../modules/InputModule';
import { MessageBubbleConfig } from '../modules/BubbleModule';
import { ChannelsItemConfig } from '../modules/conversation/ConversationItemModule';
import { ChannelsMenuItem } from '../modules/ChannelsMenu';
import { MessageMenuItem } from '../modules/MessageMenu';
import { ChannelPanelExtension, PushConfigHook } from '../modules/ChatUIStore';
import { EventDefined, InnerEvent } from './EventDefined';
import { ChatUIUserProfile } from '@lib/modules/appdata/UserCache';
import { GroupProfile, GroupMemberProfile } from '@lib/modules/appdata/GroupCache';
import { ChatUIEvent } from './ChatUIEvent';
import { __install__, ChannelIdentifier, DirectChannelIdentifier, LogLevel, Message, NCResult, SendMessageParams } from '@nexconn/chat';
import { NCChatUICode } from '@lib/enums/NCChatUICode';

/**
 * ChatUI initialization parameters
 * @description Configuration object for initializing the ChatUI application
 * @example
 * ```typescript
 * const initParams: ChatUIInitParams = {
 *   hooks: {
 *     reqUserProfiles: async (userIds) => {
 *       // Fetch user profiles from your backend
 *       return userIds.map(id => ({
 *         userId: id,
 *         name: `User ${id}`,
 *         portraitUri: `https://example.com/avatar/${id}.png`
 *       }));
 *     },
 *     reqGroupProfiles: async (groupIds) => {
 *       // Fetch group profiles from your backend
 *       return groupIds.map(id => ({
 *         groupId: id,
 *         name: `Group ${id}`,
 *         portraitUri: `https://example.com/group/${id}.png`
 *       }));
 *     },
 *     reqSystemProfiles: async (targetIds) => {
 *       // Fetch system channel profiles
 *       return targetIds.map(id => ({
 *         targetId: id,
 *         name: `System ${id}`,
 *         portraitUri: `https://example.com/system/${id}.png`
 *       }));
 *     },
 *     reqGroupMembers: async (groupId) => {
 *       // Fetch group members
 *       return [
 *         { userId: 'user1', nickname: 'Alice' },
 *         { userId: 'user2', nickname: 'Bob' }
 *       ];
 *     }
 *   },
 *   logLevel: LogLevel.INFO,
 *   language: 'en_US',
 *   allowedToRecallTime: 120,
 *   allowedToReEditTime: 60,
 *   modalContainerId: 'modal-container'
 * };
 * ```
 */
export interface ChatUIInitParams {
  /**
   * Service hooks for injecting user/group/system profile data
   * @description Provides callback functions to fetch profiles from your backend
   */
  hooks: ServiceHooks;
  /**
   * Log output level, defaults to `LogL.WARN(2)`
   */
  logLevel?: LogLevel;
  /**
   * Initial language setting
   * @description If not provided or invalid, uses page lang attribute, defaults to `en_US` if undefined
   */
  language?: string;
  // /**
  //  * Maximum pinned channel count. Zero, negative, or undefined means no limit.
  //  */
  // maxTopCount?: number;
  /**
   * Maximum time allowed to recall sent messages, in seconds
   * @description Defaults to 120 seconds if not provided or invalid
   */
  allowedToRecallTime?: number;
  /**
   * Maximum time allowed to re-edit recalled messages, in seconds
   * @description Defaults to 60 seconds if not provided or invalid
   */
  allowedToReEditTime?: number;
  /**
   * Modal container DOM element ID
   * @description Defaults to document.body if not provided
   */
  modalContainerId?: string;
}

/** Ensure the decorated API is called only before `ready()`. */
function BeforeReady(tag: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if ((this as any)._isReady) {
        (this as any)._logger.error(tag, `'${propertyKey}' must be called before 'ready'`);
        return;
      }
      return originalMethod.apply(this, args);
    };
  };
}

/** Ensure the decorated API is called only after `ready()`. */
function AfterReady(tag: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if (!(this as any)._isReady) {
        (this as any)._logger.error(tag, `'${propertyKey}' must be called after 'ready'.`);
        return;
      }
      return originalMethod.apply(this, args);
    };
  };
}

/**
 * Main ChatUI application class
 * @description The core class for managing the ChatUI SDK, providing methods for initialization, configuration, and interaction with the IM system
 * @example
 * ```typescript
 * import { NCChatUIApplication, ChatUIInitParams, ChatUIEvents } from '@nexconn/chatui';
 *
 * // Initialize the application
 * const app = NCChatUIApplication.initialize({
 *   hooks: {
 *     reqUserProfiles: async (userIds) => {
 *       // Fetch user profiles
 *       return await fetchUsersFromBackend(userIds);
 *     },
 *     reqGroupProfiles: async (groupIds) => {
 *       // Fetch group profiles
 *       return await fetchGroupsFromBackend(groupIds);
 *     },
 *     reqSystemProfiles: async (targetIds) => {
 *       // Fetch system profiles
 *       return await fetchSystemsFromBackend(targetIds);
 *     },
 *     reqGroupMembers: async (groupId) => {
 *       // Fetch group members
 *       return await fetchGroupMembersFromBackend(groupId);
 *     }
 *   },
 *   language: 'en_US',
 *   logLevel: LogL.INFO
 * });
 *
 * if (!app) {
 *   console.error('Failed to initialize ChatUI');
 *   return;
 * }
 *
 * // Configure before ready
 * app.setCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE, true);
 * app.setMessageBubbleCfg({
 *   layout: BubbleLayout.LEFT_RIGHT,
 *   showMyProfileInGroupChannel: true
 * });
 *
 * // Listen to events
 * app.addEventListener(ChatUIEvents.RECV_NEW_MESSAGES, (event) => {
 *   console.log('New messages received:', event.data);
 * });
 *
 * // Mark as ready
 * app.ready();
 *
 * // Open a channel after ready
 * await app.openChannel({ channelType: ChannelType.PRIVATE, targetId: 'user123' });
 * ```
 */
export class NCChatUIApplication extends EventDispatcher<EventDefined> {
  /**
   * Initialize the ChatUI application
   * @param opts - Initialization parameters
   * @returns ChatUI application instance or null if initialization fails
   * @example
   * ```typescript
   * const app = NCChatUIApplication.initialize({
   *   hooks: {
   *     reqUserProfiles: async (userIds) => [...],
   *     reqGroupProfiles: async (groupIds) => [...],
   *     reqSystemProfiles: async (targetIds) => [...],
   *     reqGroupMembers: async (groupId) => [...]
   *   },
   *   language: 'en_US'
   * });
   * ```
   */
  static initialize(opts: ChatUIInitParams): NCChatUIApplication | null {
    const installer: IPluginGenerator<NCChatUIApplication, ChatUIInitParams> = {
      tag: 'ChatUI',
      verify(runtime) {
        return runtime.tag === 'browser' && typeof customElements !== 'undefined';
      },
      setup(context, _, options) {
        const logger = context.createLogger('ChatUI', 'IM');

        if (options.logLevel) {
          logger.setOutputLevel(options.logLevel);
        }

        logger.warn(LogTag.A_INIT_O, `Commit: ${__COMMIT_ID__}, Version: ${__VERSION__}`);
        return new NCChatUIApplication(context, logger, options);
      },
    };
    const app = __install__(installer, opts);
    return app;
  }

  private readonly _ctx: ChatUIContext;

  private readonly _uiModule: UIModule;

  private _isReady: boolean = false;

  constructor(
    private context: PluginContext,
    private readonly _logger: ILogger,
    opts: ChatUIInitParams,
  ) {
    super();

    this._ctx = new ChatUIContext(this.context, _logger, this, opts);

    // Initialize the UI module.
    this._uiModule = new UIModule(this._ctx);

    // Listen for IM connection destruction from the application layer.
    this.context.ondestroy = this._onIMDestroy.bind(this);
  }

  // Destroy ChatUI after IMLib is deinitialized.
  private _onIMDestroy(): void {
    this.destroy()
  }

  /**
   * Set feature toggle switches. Must be called before `ready()`.
   * @param command - Feature command from ChatUICommand enum
   * @param enable - Whether to enable the feature
   * @example
   * ```typescript
   * // Enable message read status display
   * app.setCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE, true);
   *
   * // Enable @all functionality in groups
   * app.setCommandSwitch(ChatUICommand.AT_ALL, true);
   * ```
   */
  @BeforeReady(LogTag.A_SET_COMMAND_SWITCH_O)
  setCommandSwitch(command: ChatUICommand, enable: boolean): void {
    this._ctx.store.setCommandSwitch(command, enable);
  }

  /**
   * Query feature toggle switch status
   * @param command - Feature command from ChatUICommand enum
   * @returns Whether the feature is enabled
   * @example
   * ```typescript
   * const isEnabled = app.getCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE);
   * console.log('Message state display:', isEnabled);
   * ```
   */
  getCommandSwitch(command: ChatUICommand): boolean {
    return this._ctx.store.getCommandSwitch(command);
  }
  /**
   * Set channel bar visibility switch (mobile only)
   * @param enable - Whether to show the channel bar
   * @example
   * ```typescript
   * // Hide channel bar on mobile
   * app.setChannelBarSwitch(false);
   * ```
   */
  setChannelBarSwitch(enable: boolean): void {
    this._ctx.store.setChannelBarSwitch(enable);
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNEL_BAR_SWITCH_CHANGE, enable));
  }
  /**
   * Set channel detail back button visibility (mobile only)
   * @param enable - Whether to show the back button
   * @example
   * ```typescript
   * // Hide back button in channel detail
   * app.setChannelDetailBackSwitch(false);
   * ```
   */
  setChannelDetailBackSwitch(enable: boolean): void {
    this._ctx.store.setChannelDetailBackSwitch(enable);
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNEL_DETAIL_BACK_SWITCH_CHANGE, enable));
  }

  /**
   * Set channel bar title (only works when channel bar is enabled)
   * @param value - Title text, undefined to use default
   * @example
   * ```typescript
   * // Set custom title
   * app.setChannelBarTitle('My Conversations');
   *
   * // Reset to default
   * app.setChannelBarTitle(undefined);
   * ```
   */
  setChannelBarTitle(value?: string): void {
    this._ctx.store.setChannelBarTitle(value);
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.CHANNEL_BAR_TITLE_CHANGE, value));
  }

  /**
   * Register custom message types. Must be called before `ready()`.
   * @param params - Array of custom message registration configurations
   * @returns Result indicating success or failure
   * @example
   * ```typescript
   * app.registerCustomMessages([
   *   {
   *     messageType: 'custom:gift',
   *     isPersisted: true,
   *     isCounted: true,
   *     digest: (message, language) => {
   *       return language === 'en_US' ? '[Gift]' : '[Gift]';
   *     },
   *     component: {
   *       tag: 'custom-gift-message',
   *       constructor: CustomGiftMessageElement
   *     }
   *   }
   * ]);
   * ```
   */
  registerCustomMessages(params: ChatUICustomMessageRegistration[]): NCResult {
    if (this._isReady) {
      return NCResult.fail(NCChatUICode.MUST_CALL_BEFORE_READY);
    }
    return this._uiModule.registerCustomMessages(params);
  }

  // ******************************************************
  // Language configuration start.
  // ******************************************************

  /**
   * Get a copy of built-in language pack entries
   * @param lang - Language code to retrieve (e.g., 'en_US', 'zh_CN')
   * @returns Language pack entries object or null if not found
   * @example
   * ```typescript
   * const enEntries = app.cloneLanguageEntries('en_US');
   * console.log(enEntries['message.menu.item.copy']); // "Copy"
   * ```
   */
  cloneLanguageEntries(lang: string): { [key: string]: string } | null {
    // Expose `[key: string]: string` so custom application components and features compile safely.
    // Use strict internal types to verify that language pack entries exist.
    return this._ctx.i18n.cloneLanguageEntries(lang) as { [key: string]: string } | null;
  }

  /**
   * Register or override language pack. Only effective before `ready()`.
   * @param lang - Language code (e.g., 'en_US', 'zh_CN')
   * @param entries - Language pack entries
   * @param direction - Text direction, defaults to 'ltr'. Only effective when registering a new language.
   * @example
   * ```typescript
   * // Register custom language
   * app.registerLanguagePack('fr_FR', {
   *   'message.menu.item.copy': 'Copier',
   *   'message.menu.item.delete': 'Supprimer',
   *   // ... more entries
   * }, 'ltr');
   *
   * // Override existing entries
   * app.registerLanguagePack('en_US', {
   *   'message.menu.item.copy': 'Copy Message'
   * });
   * ```
   */
  @BeforeReady(LogTag.A_REGISTER_LANGUAGE_PACK_O)
  registerLanguagePack(lang: string, entries: { [key: string]: string } | LanguagePackEntries, direction: LanguageDirection = 'ltr'): void {
    // Expose `[key: string]: string` so custom application components and features compile safely.
    // Use strict internal types to verify that language pack entries exist.
    this._ctx.i18n.registerLanguagePack(lang, entries as any as LanguagePackEntries, direction);
  }

  /**
   * Switch language
   * @param lang - Target language code
   * @example
   * ```typescript
   * // Switch to English
   * app.setLanguage('en_US');
   *
   * // Switch to Chinese
   * app.setLanguage('zh_CN');
   * ```
   */
  setLanguage(lang: string): void {
    this._ctx.i18n.setLanguage(lang);
  }

  /**
   * Get current language
   * @returns Current language code
   * @example
   * ```typescript
   * const currentLang = app.getLanguage();
   * console.log('Current language:', currentLang); // "en_US"
   * ```
   */
  getLanguage(): string {
    return this._ctx.i18n.getLanguage();
  }

  /**
   * Get list of supported languages
   * @returns Array of supported language codes
   * @example
   * ```typescript
   * const languages = app.getSupportedLanguages();
   * console.log('Supported languages:', languages); // ["en_US", "zh_CN"]
   * ```
   */
  getSupportedLanguages(): string[] {
    return this._ctx.i18n.getSupportedLanguages();
  }

  // ******************************************************
  // Language configuration end.
  // ******************************************************


  /**
   * Set custom push notification configuration hook
   * @param hook - Function to modify push notification title, content, etc. before sending
   * @example
   * ```typescript
   * app.setPushConfigHook((message) => {
   *   return {
   *     pushTitle: `New message from ${message.senderUserId}`,
   *     pushContent: message.content?.text || '[Message]',
   *     pushData: JSON.stringify({ messageId: message.messageUId })
   *   };
   * });
   * ```
   */
  setPushConfigHook(hook: PushConfigHook): void {
    this._ctx.store.setPushConfigHook(hook);
  }

  // ******************************************************
  // User data updates start.
  // ******************************************************

  /**
   * Update user profile. Must be called after `ready()`.
   * @param profile - User profile data
   * @example
   * ```typescript
   * app.updateUserProfile({
   *   userId: 'user123',
   *   name: 'John Doe',
   *   portraitUri: 'https://example.com/avatar.png'
   * });
   * ```
   */
  @AfterReady(LogTag.A_UPDATE_USER_PROFILE_E)
  updateUserProfile(profile: ChatUIUserProfile): void {
    this._ctx.appData.updateUserProfile(profile);
  }

  /**
   * Update group profile. Must be called after `ready()`.
   * @param profile - Group profile data
   * @example
   * ```typescript
   * app.updateGroupProfile({
   *   groupId: 'group456',
   *   name: 'Project Team',
   *   portraitUri: 'https://example.com/group.png',
   *   memberCount: 10
   * });
   * ```
   */
  @AfterReady(LogTag.A_UPDATE_GROUP_PROFILE_E)
  updateGroupProfile(profile: GroupProfile): void {
    this._ctx.appData.updateGroupProfile(profile);
  }

  /**
   * Update user online status. Must be called after `ready()`.
   * @param userId - User ID
   * @param online - Online status
   * @example
   * ```typescript
   * // Set user as online
   * app.updateUserOnlineStatus('user123', true);
   *
   * // Set user as offline
   * app.updateUserOnlineStatus('user123', false);
   * ```
   */
  @AfterReady(LogTag.A_UPDATE_USER_ONLINE_STATE_E)
  updateUserOnlineStatus(userId: string, online: boolean): void {
    this._ctx.appData.updateUserOnlineStatus(userId, online);
  }

  /**
   * Refresh group member list immediately. This also updates the group's `memberCount`.
   * @description This operation only affects local cache and UI display, does not send requests to server.
   * @param groupId - Group ID
   * @param members - Member list
   * @example
   * ```typescript
   * app.updateGroupMembers('group456', [
   *   { userId: 'user1', nickname: 'Alice' },
   *   { userId: 'user2', nickname: 'Bob' },
   *   { userId: 'user3', nickname: 'Charlie' }
   * ]);
   * ```
   */
  @AfterReady(LogTag.A_UPDATE_GROUP_MEMBERS_E)
  updateGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    this._ctx.appData.updateGroupMembers(groupId, members);
  }

  /**
   * Add group members. This also updates the group's `memberCount`.
   * @description This operation only affects local cache and UI display, does not send requests to server.
   * @param groupId - Group ID
   * @param members - Members to add
   * @example
   * ```typescript
   * app.addGroupMembers('group456', [
   *   { userId: 'user4', nickname: 'David' },
   *   { userId: 'user5', nickname: 'Eve' }
   * ]);
   * ```
   */
  @AfterReady(LogTag.A_ADD_GROUP_MEMBERS_E)
  addGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    this._ctx.appData.addGroupMembers(groupId, members);
  }

  /**
   * Remove group members. This also updates the group's `memberCount`.
   * @description This operation only affects local cache and UI display, does not send requests to server.
   * @param groupId - Group ID
   * @param members - User IDs to remove
   * @example
   * ```typescript
   * app.removeGroupMembers('group456', ['user4', 'user5']);
   * ```
   */
  @AfterReady(LogTag.A_REMOVE_GROUP_MEMBERS_E)
  removeGroupMembers(groupId: string, members: string[]): void {
    this._ctx.appData.removeGroupMembers(groupId, members);
  }

  // ******************************************************
  // User data updates end.
  // ******************************************************

  /**
   * Get a copy of the channel list context menu
   * @returns Array of channel menu items
   * @example
   * ```typescript
   * const menu = app.cloneChannelsMenu();
   * console.log('Channel menu items:', menu);
   * ```
   */
  cloneChannelsMenu(): ChannelsMenuItem[] {
    return this._ctx.channelsMenu.cloneChannelsMenu();
  }

  /**
   * Set channel list context menu
   * @param menu - Array of channel menu items
   * @example
   * ```typescript
   * const menu = app.cloneChannelsMenu();
   * menu.items.push({
   *   {
   *     id: 'custom:archive',
   *     icon: 'archive-icon.svg'
   *   }
   * ]);
   * app.setChannelsMenu(menu);
   * ```
   */
  setChannelsMenu(menu: ChannelsMenuItem[]): void {
    this._ctx.channelsMenu.setChannelsMenu(menu);
  }

  /**
   * Get a copy of the message context menu
   * @returns Array of message menu items
   * @example
   * ```typescript
   * const menu = app.cloneMessageMenu();
   * console.log('Message menu items:', menu);
   * ```
   */
  cloneMessageMenu(): MessageMenuItem[] {
    return this._ctx.msgMenu.cloneMessageMenu();
  }

  /**
   * Set message context menu
   * @param menu - Array of message menu items
   * @example
   * ```typescript
   * const menu = app.cloneMessageMenu();
   * menu.items.push({
   *   {
   *     id: 'custom:translate',
   *     icon: 'translate-icon.svg'
   *   }
   * });
   * app.setMessageMenu(menu);
   * ```
   */
  setMessageMenu(menu: MessageMenuItem[]) {
    this._ctx.msgMenu.setMessageMenu(menu);
  }

  // ******************************************************
  // Channel operations start.
  // ******************************************************

  /**
   * Open a specific channel. If the channel doesn't exist in the current channel list, creates it and places it at the top.
   * @param identifier - Channel identifier (channelType + targetId)
   * @param focusInput - Whether to focus the input box, defaults to true
   * @returns Result indicating success or failure
   * @example
   * ```typescript
   * // Open a private chat
   * await app.openChannel(new DirectChannelIdentifier('user123'), true);
   *
   * // Open a group chat
   * await app.openChannel(new GroupChannelIdentifier('group456'), true);
   * ```
   */
  @AfterReady(LogTag.A_OPEN_CHANNEL_E)
  async openChannel(identifier: ChannelIdentifier, focusInput: boolean = true): Promise<NCResult> {
    return this._ctx.channelModule.openChannel(identifier, focusInput);
  }

  /**
   * Delete a specific channel
   * @param channelIdentifier - Channel identifier
   * @example
   * ```typescript
   * await app.deleteChannel(channelIdentifier);
   * ```
   */
  @AfterReady(LogTag.A_DELETE_CHANNEL_E)
  deleteChannel(channelIdentifier: ChannelIdentifier): Promise<void> {
    return this._ctx.channelModule.deleteChannel(channelIdentifier);
  }

  /**
   * Get the currently opened channel. Returns null if no channel is open.
   * @returns Channel model or null
   * @example
   * ```typescript
   * const channel = app.getOpenedChannel();
   * if (channel) {
   *   console.log('Current channel:', channel.channelIdentifier);
   * }
   * ```
   */
  getOpenedChannel(): ChatUIChannelModel | null {
    const data = this._ctx.channelModule.getOpenedChannelModel();
    return data ? data.clone() : null;
  }

  /**
   * Add feature extensions to the channel detail panel. Only effective before `ready()`.
   * @param extensions - Array of extension configurations
   * @description When users click an extension, the {@link ChatUIEvents.CHANNEL_PANEL_EXTENSION_TOUCH} event will be dispatched.
   * @example
   * ```typescript
   * app.setChannelPanelExtensions([
   *   {
   *     id: 'video-call',
   *     icon: 'video-icon.svg',
   *     filter: (model) => model.channelType === ChannelType.PRIVATE
   *   },
   *   {
   *     id: 'group-settings',
   *     icon: 'settings-icon.svg',
   *     filter: (model) => model.channelType === ChannelType.GROUP
   *   }
   * ]);
   *
   * // Listen to extension clicks
   * app.addEventListener(ChatUIEvents.CHANNEL_PANEL_EXTENSION_TOUCH, (event) => {
   *   console.log('Extension clicked:', event.data.id);
   * });
   * ```
   */
  @BeforeReady(LogTag.A_SET_CHANNEL_PANEL_EXTENSION_E)
  setChannelPanelExtensions(extensions: ChannelPanelExtension[]) {
    this._ctx.store.setChannelPanelExtensions(extensions);
  }

  // ******************************************************
  // Channel operations end.
  // ******************************************************

  // ******************************************************
  // Input customization start.
  // ******************************************************

  /**
   * Get a copy of the input menu configuration
   * @returns Input menu configuration
   * @example
   * ```typescript
   * const menu = app.cloneInputMenu();
   * console.log('Input menu items:', menu.items);
   * ```
   */
  cloneInputMenu(): InputMenu {
    return this._ctx.input.cloneInputMenu();
  }

  /**
   * Set new input menu configuration. Must be called before `ready()`.
   * @param menu - Input menu configuration
   * @example
   * ```typescript
   * const menu = app.cloneInputMenu();
   * menu.items.push({
   *   id: 'custom:location',
   *   order: 10,
   *   icon: 'location-icon.svg'
   * });
   * app.setInputMenu(menu);
   * ```
   */
  @BeforeReady(LogTag.A_SET_INPUT_MENU_E)
  setInputMenu(menu: InputMenu): void {
    this._ctx.input.setInputMenu(menu);
  }

  /**
   * Get a copy of the message bubble configuration
   * @returns Message bubble configuration
   * @example
   * ```typescript
   * const config = app.cloneMessageBubbleConfig();
   * console.log('Bubble configuration:', config);
   * ```
   */
  cloneMessageBubbleConfig(): MessageBubbleConfig {
    return this._ctx.bubble.cloneMessageBubbleConfig();
  }

  /**
   * Set message bubble configuration. Must be called before `ready()`.
   * @param config - Message bubble configuration
   * @example
   * ```typescript
   * app.setMessageBubbleConfig({
   *   layout: BubbleLayout.LEFT_RIGHT,
   *   redius: 12,
   *   backgroundColorForMyself: 0x007AFF,
   *   backgroundColorForOthers: 0xE5E5EA,
   *   showMyProfileInGroupChannel: true,
   *   showOthersNameInGroupChannel: true
   * });
   * ```
   */
  @BeforeReady(LogTag.A_SET_MESSAGE_BUBBLE_CFG_E)
  setMessageBubbleConfig(config: MessageBubbleConfig): void {
    this._ctx.bubble.setMessageBubbleConfig(config);
  }

  /**
   * Get a copy of the channel list item configuration
   * @returns Channel list item configuration
   * @example
   * ```typescript
   * const config = app.cloneChannelsItemConfig();
   * console.log('Channel item config:', config);
   * ```
   */
  cloneChannelsItemConfig(): ChannelsItemConfig {
    return this._ctx.channelItem.cloneChannelsItemConfig();
  }

  /**
   * Set channel list item configuration. Must be called before `ready()`.
   * @param config - Channel list item configuration
   * @example
   * ```typescript
   * const config = app.cloneChannelsItemConfig();
   * config.showUnreadBadge = true;
   * config.showTimestamp = true;
   * app.setChannelsItemConfig(config);
   * ```
   */
  @BeforeReady(LogTag.A_SET_CHANNELS_ITEM_CFG_E)
  setChannelsItemConfig(config: ChannelsItemConfig): void {
    this._ctx.channelItem.setChannelsItemConfig(config);
  }

  /**
   * Get a copy of existing image emoji libraries
   * @returns Array of image emoji libraries
   * @example
   * ```typescript
   * const libraries = app.cloneImageEmojiLibraries();
   * console.log('Emoji libraries:', libraries);
   * ```
   */
  cloneImageEmojiLibraries(): ImageEmojiLibrary[] {
    return this._ctx.input.cloneImageEmojiLibraries();
  }

  /**
   * Set image emoji libraries
   * @param libraries - Array of image emoji libraries
   * @example
   * ```typescript
   * const libraries = app.cloneImageEmojiLibraries();
   * libraries.push({
   *   id: 'custom-emoji-1',
   *   icon: 'emoji-lib-icon.svg',
   *   itemWidth: 60,
   *   itemHeight: 60,
   *   order: 0,
   *   items: [
   *     {
   *       thumbnail: 'data:image/png;base64,...',
   *       thunbnailWidth: 60,
   *       thunbnailHeight: 60,
   *       url: 'https://example.com/emoji1.png',
   *       width: 120,
   *       height: 120
   *     }
   *   ]
   * });
   * app.setImageEmojiLibraries(libraries);
   * ```
   */
  setImageEmojiLibraries(libraries: ImageEmojiLibrary[]): void {
    this._ctx.input.setImageEmojiLibraries(libraries);
  }

  /**
   * Get a copy of the character emoji library
   * @returns Character emoji library
   * @example
   * ```typescript
   * const library = app.cloneChatEmojiLibrary();
   * console.log('Emoji library:', library);
   * ```
   */
  cloneChatEmojiLibrary(): ChatUIEmojiLibrary {
    return this._ctx.input.cloneChatEmojiLibrary();
  }

  /**
   * Set character emoji library. Must be called before `ready()`.
   * @param library - Character emoji library
   * @example
   * ```typescript
   * const library = app.cloneChatEmojiLibrary();
   * library.items.push('😀', '😃', '😄', '😁', '😆');
   * app.setChatEmojiLibrary(library);
   * ```
   */
  @BeforeReady(LogTag.A_SET_CHAT_EMOJI_LIBRARY_E)
  setChatEmojiLibrary(library: ChatUIEmojiLibrary): void {
    this._ctx.input.setChatEmojiLibrary(library);
  }

  // ******************************************************
  // Input customization end.
  // ******************************************************

  /**
   * Send a message
   * @param channelIdentifier - Channel identifier
   * @param params - Send message parameters
   * @returns Result containing the sent message or error
   * @example
   * ```typescript
   * // Send a text message
   * const result = await app.sendMessage(
   *   new DirectChannelIdentifier('user123'),
   *   new SendTextMessageParams({ text: 'Hello, world!' })
   * );
   * ```
   */
  async sendMessage<T extends Record<string, any>>(
    channelIdentifier: ChannelIdentifier,
    params: SendMessageParams<T>
  ): Promise<NCResult<Message<T>>> {
    if (!this._isReady) {
      return NCResult.fail(NCChatUICode.CHATUI_NOT_READY);
    }
    return this._ctx.message.sendMessage(channelIdentifier, params);
  }

  /**
   * Insert a message into the local cache
   * @param message - Message to insert
   * @returns Result indicating success or failure
   * @example
   * ```typescript
   * import { Helper, SendTextMessageParams, DirectChannelIdentifier } from '@nexconn/chat';
   *
   * const message = Helper.createMessage(
   *   new DirectChannelIdentifier('user123'),
   *   new SendTextMessageParams({ text: 'Local message' })
   * );
   * message.sentTime = Date.now();
   * const result = await app.insertMessage(message);
   * ```
   */
  async insertMessage<T extends Record<string, any>>(message: Message<T>): Promise<NCResult> {
    if (!this._isReady) {
      return NCResult.fail(NCChatUICode.CHATUI_NOT_READY);
    }
    return this._ctx.message.insertMessage(message);
  }

  /**
   * Notify the SDK that configuration is complete and ready for initialization
   * @description This method registers all custom elements and marks the application as ready. Must be called after all configuration methods.
   * @example
   * ```typescript
   * const app = NCChatUIApplication.initialize({ ... });
   *
   * // Configure before ready
   * app.setCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE, true);
   * app.setMessageBubbleCfg({ layout: BubbleLayout.LEFT_RIGHT });
   *
   * // Mark as ready
   * app.ready();
   *
   * // Now you can call after-ready methods
   * await app.openChannel(new DirectChannelIdentifier('user123'));
   * ```
   */
  ready(): void {
    if (this._isReady) {
      this._logger.warn(LogTag.A_READY_O, '\'ready()\' has been called before.');
      return;
    }

    this._logger.info(LogTag.A_READY_O, '\'ready()\' has been called.');
    this._uiModule.registerDOMElements();
    this._isReady = true;
  }

  /**
   * Check if the SDK has completed initialization
   * @returns Whether initialization is complete
   * @example
   * ```typescript
   * if (app.ifReady()) {
   *   console.log('App is ready');
   *   await app.openChannel({ ... });
   * } else {
   *   console.log('App is not ready yet');
   * }
   * ```
   */
  ifReady(): boolean {
    return this._isReady;
  }

  /**
   * Get the current user ID
   * @returns Current user ID
   * @example
   * ```typescript
   * const userId = app.getCurrenUserId();
   * console.log('Current user:', userId);
   * ```
   */
  getCurrenUserId(): string {
    return this._ctx.userId;
  }

  /**
   * Destroy the application and clean up resources
   * @description Removes all event listeners and destroys internal modules
   * @example
   * ```typescript
   * // Clean up when unmounting
   * app.destroy();
   * ```
   */
  destroy(): void {
    this.removeAllEventListeners();
    this._ctx.destroy();
    this._uiModule.destroy();
  }
}
