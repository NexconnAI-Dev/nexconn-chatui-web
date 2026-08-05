import { VersionManage } from '@nexconn/engine';
VersionManage.add('nexconnchatui', __VERSION__);

export {
  type LanguageDirection,
  type LanguagePackEntries
} from './languages';
export type { ChatUIEvent } from './core/ChatUIEvent';
export type { ServiceHooks } from './modules/appdata/AppDataModule';
export type { GroupProfile, GroupMemberProfile } from './modules/appdata/GroupCache';
export type { ChatUIUserProfile } from './modules/appdata/UserCache';
export type { ChatUISystemProfile } from './modules/appdata/SystemCache';
export { type ChatUIChannelModel } from './models/NCUIChannelModel';
export { ChatUIMentionedType } from './enums/ChatUIMentionedType';
export { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
export type {
  CustomElementClass,
  CustomMessageComponent,
  ChatUICustomMessageRegistration,
} from './ui'
export {
  type ChatUIInitParams,
  NCChatUIApplication
} from './core/NCChatUIApplication';
export {
  ChatUICommand
} from './enums/ChatUICommand';
export {
  ChatUIEvents,
  ModalForwardingType,
} from './core/EventDefined';
export {
  type SystemChannelOpeningEvent,
  type ModalForwardingResult,
  type ChannelPanelExtensionClick,
  type ChannelsMenuItemClick,
  type InputMenuItemClick,
  type MessageInputEventData,
  type MessageInputFocusEvent,
  type MessageInputBlurEvent,
  type MessageInputChangeEvent,
  type MessageWillSendEventData,
  type MessageWillSendEvent,
  type ChannelIconClick,
  type DeleteMessageData,
  type MessageMenuItemClick,
  type MessageLinckClick,
} from './core/EventDefined';
export {
  type InputMenu,
  type InputMenumItem,
  type ChatUIEmojiLibrary,
  type ImageEmojiLibrary,
  type ImageEmoji,
  type ImageEmojiThumbnail,
  type GifInfo,
} from './modules/InputModule';
export { type MessageBubbleConfig } from './modules/BubbleModule';
export { type ChannelsItemConfig } from './modules/conversation/ConversationItemModule';
export { BubbleLayout } from './modules/BubbleModule';
export { InputMenumPosition, InputMenumID, ChatUIEmojiLibraryID } from './modules/InputModule';
export {
  type ChannelsMenuItem,
  ChannelsMenuID,
} from './modules/ChannelsMenu';
export {
  type MessageMenuItem,
  MessageMenuID,
} from './modules/MessageMenu';
export type { ChannelPanelExtension, PushConfigHook } from './modules/ChatUIStore';
