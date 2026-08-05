import { ChannelIdentifier, ConnectionStatus, MessageDeletedInfo, SendMessageParams } from '@nexconn/chat';
import { ChatUIEvent } from './ChatUIEvent';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ICacheUserProfile } from '@lib/modules/appdata/UserCache';
import { ICacheGroupProfile, GroupMemberProfile } from '@lib/modules/appdata/GroupCache';
import { ICacheSystemProfile } from '@lib/modules/appdata/SystemCache';

export interface DeleteMessageData {
  channelIdentifier: ChannelIdentifier,
  // May be absent for local deletion.
  messageId: string,
  transactionId?: number,
}
export interface ChannelPanelExtensionClick {
  /** ID assigned when the extension was registered */
  id: string
  /** Channel active when the extension was clicked */
  channelModel: ChatUIChannelModel
}
export interface ChannelsMenuItemClick {
  /** Channel menu item ID */
  id: string
  /** Channel data */
  channelModel: ChatUIChannelModel
}
export interface InputMenuItemClick {
  id: string
  channelModel: ChatUIChannelModel
}
/**
 * Message input event data
 * @since 26.2.4
 */
export interface MessageInputEventData {
  value: string;
}
/**
 * Message pre-send event data
 * @since 26.2.4
 */
export interface MessageWillSendEventData<T extends Record<string, any> = any> {
  channelIdentifier: ChannelIdentifier;
  params: SendMessageParams<T>;
}
export interface ChannelIconClick {
  channelIdentifier: ChannelIdentifier
  profile: {
    name: string
    nickname?: string
    userId: string
    avatarUrl: string
  }
}
export interface MessageMenuItemClick {
  /** Message menu item ID */
  id: string;
  /** Message data */
  message: ChatUIMessageModel,
}
export interface MessageLinckClick {
  /** Email or URL */
  type: string,
  /** Address */
  address: string,
}

export interface IConnectionStatusChange {
  status: ConnectionStatus;
  code?: number;
}
export class ConnectionStatusChangeEvent extends ChatUIEvent<'CONNECTION_STATUS_CHANGE', IConnectionStatusChange> {
  constructor(status: ConnectionStatus, code?: number) {
    super(InnerEvent.CONNECTION_STATUS_CHANGE, { status, code });
  }
}

export interface ChannelSelectedInfo {
  model: ChatUIChannelModel | null;
  focusInput?: boolean;
}

export type ChannelSelectedEvent = ChatUIEvent<'CHANNEL_SELECTED', ChannelSelectedInfo>;
export type ConfirmEvent = ChatUIEvent<'CONFIRM_EVENT', string, boolean>;
export type AlertEvent = ChatUIEvent<'ALERT_EVENT', string>;

export enum ModalForwardingType {
  /** Forward a single message */
  SINGLE = 'single',
  /** Forward merged messages */
  MERGE = 'merge',
}
export interface ModalForwardingResult {
  confirm: boolean,
  list?: ChatUIChannelModel[]
}
export type ForwardingEvent = ChatUIEvent<'FORWARDING_EVENT', ModalForwardingType, ModalForwardingResult>;

export interface ModalDeleteMessage {
  /**
   * Messages to delete or recall
   */
  messages: ChatUIMessageModel[]
}

export type UserProfilesUpdateEvent = ChatUIEvent<'USER_PROFILES_UPDATE', ICacheUserProfile[]>;
export type GroupProfilesUpdateEvent = ChatUIEvent<'GROUP_PROFILES_UPDATE', ICacheGroupProfile[]>;
export type GroupMembersUpdateEvent = ChatUIEvent<'GROUP_MEMBERS_UPDATE', {
  groupId: string;
  members: GroupMemberProfile[];
}>;
export type SystemProfilesUpdateEvent = ChatUIEvent<'SYSTEM_PROFILES_UPDATE', ICacheSystemProfile[]>;
export type ChannelsMenuItemClickEvent = ChatUIEvent<'CHANNELS_MENU_ITEM_CLICK', ChannelsMenuItemClick>;
/**
 * Initial channel list rendering event
 */
export type ChannelListFirstScreenRenderingEvent = ChatUIEvent<'CHANNELS_LIST_RESET', ChatUIChannelModel[]>;
export type ChannelsItemOrderChangeEvent = ChatUIEvent<'CHANNELS_ITEM_ORDER_CHANGE', {
  order: number;
  model: ChatUIChannelModel;
}[]>;
export type ChannelListItemChangeEvent = ChatUIEvent<'CHANNELS_ITEM_CHANGE', ChatUIChannelModel[]>;
export type ChannelsItemDelteedEvent = ChatUIEvent<'CHANNELS_ITEM_DELETED', ChatUIChannelModel[]>;
export type MessageStateChangeEvent = ChatUIEvent<'MESSAGE_STATE_CHANGE', ChatUIMessageModel[]>;
export type InsertNewMessagesEvent = ChatUIEvent<'INSERT_NEW_MESSAGES', ChatUIMessageModel[]>;
export type RecvNewMessagesEvent = ChatUIEvent<'RECV_NEW_MESSAGES', ChatUIMessageModel[]>;
export type MessagesDeletedEvent = ChatUIEvent<'MESSAGES_DELETED', DeleteMessageData[]>;
export type SystemChannelOpeningEvent = ChatUIEvent<'SYSTEM_CHANNEL_OPENING', ChatUIChannelModel>;

export type DownloadLinkEvent = ChatUIEvent<'DOWNLOAD_LINK_EVENT', ChatUIMessageModel>;
export type FileSendFailedEvent = ChatUIEvent<'FILE_SEND_FAILED_EVENT', File[]>;
/**
 * Message input focus event
 * @since 26.2.4
 */
export type MessageInputFocusEvent = ChatUIEvent<'MESSAGE_INPUT_FOCUS', MessageInputEventData>;
/**
 * Message input blur event
 * @since 26.2.4
 */
export type MessageInputBlurEvent = ChatUIEvent<'MESSAGE_INPUT_BLUR', MessageInputEventData>;
/**
 * Message input change event
 * @since 26.2.4
 */
export type MessageInputChangeEvent = ChatUIEvent<'MESSAGE_INPUT_CHANGE', MessageInputEventData>;
/**
 * Message pre-send event
 * @since 26.2.4
 */
export type MessageWillSendEvent<T extends Record<string, any> = any> = ChatUIEvent<'MESSAGE_WILL_SEND', MessageWillSendEventData<T>>;

export type AudioPlayState = {
  /**
   * Playback progress
   */
  progress: number,
  /**
   * Playback state
   * - playing: playback is active
   * - stopped: playback stopped; use progress to determine whether it completed
   */
  status: 'playing' | 'stopped',
  /**
   * UID of the message whose audio is playing
   */
  messageUId: string,
  /**
   * Transaction ID of the message whose audio is playing
   */
  transactionId?: number,
}

/**
 * Audio message playback event
 */
export type AudioPlayEvent = ChatUIEvent<'AUDIO_PLAY_EVENT', AudioPlayState>
export type SetTextareaValueEvent = ChatUIEvent<'SET_TEXTAREA_VALUE_EVENT', string>

/**
 * Speech-to-text state change event
 */
export interface ISpeechToTextStateChange {
  /**
   * Message UID
   */
  messageUId: string;
  /**
   * Conversion state
   * - converting: conversion is in progress
   * - success: conversion succeeded
   * - error: conversion failed
   */
  status: 'converting' | 'success' | 'error';
  /**
   * Converted text, available only when status is `success`
   */
  text?: string;
  /**
   * Conversion error code, available only when the API code is not `SUCCESS`
   */
  errorCode?: number;
}

export type SpeechToTextStateChangeEvent = ChatUIEvent<'SPEECH_TO_TEXT_STATE_CHANGE', ISpeechToTextStateChange>

/**
 * Internal event type definitions.
 * @description Internal events extend public event definitions so the SDK can retain default handling when the application does not intercept an event.
 */
export interface EventDefined {
  /**
   * User profile update event
   */
  USER_PROFILES_UPDATE: UserProfilesUpdateEvent,
  /**
   * Group profile update event
   */
  GROUP_PROFILES_UPDATE: GroupProfilesUpdateEvent,
  /**
   * Group member update event
   */
  GROUP_MEMBERS_UPDATE: GroupMembersUpdateEvent,
  /**
   * Connection status change event
   */
  CONNECTION_STATUS_CHANGE: ConnectionStatusChangeEvent,
  /**
   * Language change event
   */
  LANGUAGE_CHANGE: ChatUIEvent<'LANGUAGE_CHANGE', { lang: string, direction: 'ltr' | 'rtl' }>,
  /**
   * Initial channel list rendering event
   */
  CHANNELS_LIST_RESET: ChannelListFirstScreenRenderingEvent,
  /**
   * Channel list item update event
   */
  CHANNELS_ITEM_CHANGE: ChannelListItemChangeEvent,
  /**
   * Channel list item order change event. The list must reposition elements and refresh their displayed properties.
   */
  CHANNELS_ITEM_ORDER_CHANGE: ChannelsItemOrderChangeEvent,
  /**
   * Channel list item deletion event
   */
  CHANNELS_ITEM_DELETED: ChannelsItemDelteedEvent,
  /**
   * Selected channel change event
   */
  CHANNEL_SELECTED: ChannelSelectedEvent,
  /**
   * System channel profile update event
   */
  SYSTEM_PROFILES_UPDATE: SystemProfilesUpdateEvent,
  /**
   * Requests cache destruction when the new user differs from the previous user.
   */
  DESTROY_USER_CACHE: ChatUIEvent<'DESTROY_USER_CACHE'>,
  /**
   * Requests cache initialization once after the user's first sign-in.
   */
  INIT_USER_CACHE: ChatUIEvent<'INIT_USER_CACHE'>,
  /**
   * Confirmation dialog event
   */
  CONFIRM_EVENT: ConfirmEvent,
  /**
   * Alert dialog event
   */
  ALERT_EVENT: AlertEvent,
  /**
   * Message forwarding dialog event
   */
  FORWARDING_EVENT: ForwardingEvent,
  /**
   * Media message dialog event
   */
  MEDIA_MESSAGE_MODAL_EVENT: ChatUIEvent<'MEDIA_MESSAGE_MODAL_EVENT', ChatUIMessageModel>,
  /**
   * Merged message forwarding dialog event
   */
  COMBINE_MESSAGE_MODAL_EVENT: ChatUIEvent<'COMBINE_MESSAGE_MODAL_EVENT', ChatUIMessageModel>,
  /**
   * Take photo dialog event
   */
  TAKE_PHOTO_MODAL_EVENT: ChatUIEvent<'TAKE_PHOTO_MODAL_EVENT'>,
  /**
   * Message deletion or recall notification
   */
  MESSAGES_DELETED: MessagesDeletedEvent,
  /**
   * Messages the SDK cannot handle internally. The application can receive them through this event.
   */
  UNSCHEDULED_MESSAGES: ChatUIEvent<'UNSCHEDULED_MESSAGES', ChatUIMessageModel[]>,
  /**
   * Channel menu item click event
   */
  CHANNELS_MENU_ITEM_CLICK: ChannelsMenuItemClickEvent,
  /**
   * Message menu item click event
   */
  MESSAGE_MENU_ITEM_CLICK: ChatUIEvent<'MESSAGE_MENU_ITEM_CLICK', MessageMenuItemClick>
  /**
   * Input menu button click event
   */
  INPUT_MENU_ITEM_CLICK: ChatUIEvent<'INPUT_MENU_ITEM_CLICK', InputMenuItemClick>,
  /**
   * Message input focus event
   */
  MESSAGE_INPUT_FOCUS: MessageInputFocusEvent,
  /**
   * Message input blur event
   */
  MESSAGE_INPUT_BLUR: MessageInputBlurEvent,
  /**
   * Message input change event
   */
  MESSAGE_INPUT_CHANGE: MessageInputChangeEvent,
  /**
   * Message pre-send event
   */
  MESSAGE_WILL_SEND: MessageWillSendEvent,
  /**
   * Event emitted before opening a system channel. The application can intercept it to provide custom behavior.
   */
  SYSTEM_CHANNEL_OPENING: SystemChannelOpeningEvent,
  /**
   * New message event used by UI and data modules to process updates.
   */
  RECV_NEW_MESSAGES: RecvNewMessagesEvent,
  /**
   * Message insertion event used by UI and data modules to process updates.
   */
  INSERT_NEW_MESSAGES: InsertNewMessagesEvent,
  /**
   * Message state change event, such as send status or file upload progress updates.
   */
  MESSAGE_STATE_CHANGE: MessageStateChangeEvent,
  /**
   * Application extension button click event, dispatched directly to the application.
   */
  CHANNEL_PANEL_EXTENSION_TOUCH: ChatUIEvent<'CHANNEL_PANEL_EXTENSION_TOUCH', ChannelPanelExtensionClick>,
  /**
   * Message list avatar click event
   */
  CHANNEL_ICON_CLICK: ChatUIEvent<'CHANNEL_ICON_CLICK', ChannelIconClick>,
  /**
   * Message list header avatar click event
   */
  CHANNEL_NAVI_CLICK: ChatUIEvent<'CHANNEL_NAVI_CLICK', ChatUIChannelModel>,
  /**
   * Text message link click event
   */
  MESSAGE_LINK_CLICK: ChatUIEvent<'MESSAGE_LINK_CLICK', MessageLinckClick>
  DOWNLOAD_LINK_EVENT: DownloadLinkEvent,
  FILE_SEND_FAILED_EVENT: FileSendFailedEvent,
  /** Audio message playback event */
  AUDIO_PLAY_EVENT: AudioPlayEvent,
  SET_TEXTAREA_VALUE_EVENT: SetTextareaValueEvent,
  /** Speech-to-text state change event */
  SPEECH_TO_TEXT_STATE_CHANGE: SpeechToTextStateChangeEvent,
  /**
   * Channel bar visibility change event
   */
  CHANNEL_BAR_SWITCH_CHANGE: ChatUIEvent<'CHANNEL_BAR_SWITCH_CHANGE', boolean>,
  /**
   * Channel detail back button visibility change event
   */
  CHANNEL_DETAIL_BACK_SWITCH_CHANGE: ChatUIEvent<'CHANNEL_DETAIL_BACK_SWITCH_CHANGE', boolean>,
  /**
   * Channel bar title change event
   */
  CHANNEL_BAR_TITLE_CHANGE: ChatUIEvent<'CHANNEL_BAR_TITLE_CHANGE', string>,
  /**
   * Toast display event
   */
  TOAST_EVENT: ChatUIEvent<'TOAST_EVENT', { message: string; showIcon?: boolean }>,
  /**
   * Message list scroll adjustment event
   */
  ADJUST_MESSAGE_LIST_SCROLL: ChatUIEvent<InnerEvent.ADJUST_MESSAGE_LIST_SCROLL>,
}

/**
 * Internal event types
 */
export enum InnerEvent {
  /**
   * User profile update event
   */
  USER_PROFILES_UPDATE = 'USER_PROFILES_UPDATE',
  /**
   * Group profile update event
   */
  GROUP_PROFILES_UPDATE = 'GROUP_PROFILES_UPDATE',
  /**
   * Group member update event
   */
  GROUP_MEMBERS_UPDATE = 'GROUP_MEMBERS_UPDATE',
  INIT_USER_CACHE = 'INIT_USER_CACHE',
  DESTROY_USER_CACHE = 'DESTROY_USER_CACHE',
  SYSTEM_PROFILES_UPDATE = 'SYSTEM_PROFILES_UPDATE',
  CHANNELS_ITEM_CHANGE = 'CHANNELS_ITEM_CHANGE',
  CHANNELS_LIST_RESET = 'CHANNELS_LIST_RESET',
  CHANNELS_ITEM_ORDER_CHANGE = 'CHANNELS_ITEM_ORDER_CHANGE',
  CHANNELS_ITEM_DELETED = 'CHANNELS_ITEM_DELETED',
  MESSAGE_STATE_CHANGE = 'MESSAGE_STATE_CHANGE',
  INSERT_NEW_MESSAGES = 'INSERT_NEW_MESSAGES',
  LANGUAGE_CHANGE = 'LANGUAGE_CHANGE',
  AUDIO_PLAY_EVENT = 'AUDIO_PLAY_EVENT',
  SET_TEXTAREA_VALUE_EVENT = 'SET_TEXTAREA_VALUE_EVENT',
  ADJUST_MESSAGE_LIST_SCROLL = 'ADJUST_MESSAGE_LIST_SCROLL',
  /**
   * Internal speech-to-text state change event
   */
  SPEECH_TO_TEXT_STATE_CHANGE = 'SPEECH_TO_TEXT_STATE_CHANGE',
  /**
   * Internal new message event
   */
  RECV_NEW_MESSAGES = 'RECV_NEW_MESSAGES',
  /**
   * Connection status change event
   */
  CONNECTION_STATUS_CHANGE = 'CONNECTION_STATUS_CHANGE',
  /**
   * Channel bar visibility change event
   */
  CHANNEL_BAR_SWITCH_CHANGE = 'CHANNEL_BAR_SWITCH_CHANGE',
  /**
   * Channel detail back button visibility change event
   */
  CHANNEL_DETAIL_BACK_SWITCH_CHANGE = 'CHANNEL_DETAIL_BACK_SWITCH_CHANGE',
  /**
   * Channel bar title change event
   */
  CHANNEL_BAR_TITLE_CHANGE = 'CHANNEL_BAR_TITLE_CHANGE',
  /**
   * Toast display event
   */
  TOAST_EVENT = 'TOAST_EVENT',
}

/**
 * Public event types
 */
export enum ChatUIEvents {
  /**
   * Confirmation dialog event
   */
  CONFIRM_EVENT = 'CONFIRM_EVENT',
  /**
   * Alert dialog event
   */
  ALERT_EVENT = 'ALERT_EVENT',
  /**
   * Media message dialog event
   */
  MEDIA_MESSAGE_MODAL_EVENT = 'MEDIA_MESSAGE_MODAL_EVENT',
  /**
   * Merged message forwarding dialog event
   */
  COMBINE_MESSAGE_MODAL_EVENT = 'COMBINE_MESSAGE_MODAL_EVENT',
  /**
   * Message forwarding dialog event
   */
  FORWARDING_EVENT = 'FORWARDING_EVENT',
  /**
   * Take photo dialog event
   */
  TAKE_PHOTO_MODAL_EVENT = 'TAKE_PHOTO_MODAL_EVENT',
  /**
   * Messages the SDK cannot handle internally. The application can receive them through this event.
   */
  UNSCHEDULED_MESSAGES = 'UNSCHEDULED_MESSAGES',
  /**
   * Application extension button click event
   */
  CHANNEL_PANEL_EXTENSION_TOUCH = 'CHANNEL_PANEL_EXTENSION_TOUCH',
  /**
   * Event emitted before opening a system channel. The application can intercept it to provide custom behavior.
   */
  SYSTEM_CHANNEL_OPENING = 'SYSTEM_CHANNEL_OPENING',
  /**
   * Channel menu item click event
   */
  CHANNELS_MENU_ITEM_CLICK = 'CHANNELS_MENU_ITEM_CLICK',
  /**
   * Input menu click event
   */
  INPUT_MENU_ITEM_CLICK = 'INPUT_MENU_ITEM_CLICK',
  /**
   * Message input focus event
   * @since 26.2.4
   */
  MESSAGE_INPUT_FOCUS = 'MESSAGE_INPUT_FOCUS',
  /**
   * Message input blur event
   * @since 26.2.4
   */
  MESSAGE_INPUT_BLUR = 'MESSAGE_INPUT_BLUR',
  /**
   * Message input change event
   * @since 26.2.4
   */
  MESSAGE_INPUT_CHANGE = 'MESSAGE_INPUT_CHANGE',
  /**
   * Message pre-send event
   * @since 26.2.4
   */
  MESSAGE_WILL_SEND = 'MESSAGE_WILL_SEND',
  /**
   * Selected channel change event, emitted when a channel is selected in the list.
   */
  CHANNEL_SELECTED = 'CHANNEL_SELECTED',
  /**
   * Message list avatar click event
   */
  CHANNEL_ICON_CLICK = 'CHANNEL_ICON_CLICK',
  /**
   * Message list header avatar click event
   */
  CHANNEL_NAVI_CLICK = 'CHANNEL_NAVI_CLICK',
  /**
   * Message menu click event
   */
  MESSAGE_MENU_ITEM_CLICK = 'MESSAGE_MENU_ITEM_CLICK',
  /**
   * Text message link click event
   */
  MESSAGE_LINK_CLICK = 'MESSAGE_LINK_CLICK',
  /**
   * Download link event
   */
  DOWNLOAD_LINK_EVENT = 'DOWNLOAD_LINK_EVENT',
  /**
   * File send failure event, usually caused by an oversized or empty file.
   */
  FILE_SEND_FAILED_EVENT = 'FILE_SEND_FAILED_EVENT',
  /**
   * Message deletion or recall notification
   */
  MESSAGES_DELETED = 'MESSAGES_DELETED',
  /**
   * Toast display event
   */
  TOAST_EVENT = 'TOAST_EVENT',
}
