import { ReadReceiptModalElement } from './read-receipt-modal';
import { ChannelListItemElement } from './channel-list-item';
import { IconElement } from './icon';
import { ChannelMutedIconElement } from './icon-notification';
import { PinnedIconElement } from './icon-top';
import { ChannelLabelElement } from './channel-label';
import { LatestMessageElement } from './latest-message';
import { ChannelUnreadElement } from './channel-unread';
import { ChannelListMenuItemElement } from './channel-list-menu-item';
import { ChannelEmptyElement } from './channel-empty';
import { ChannelListEmptyElement } from './channel-list-empty';
import { MessageListMenuItemElement } from './message-list-menu-item';
import { MessageTimeElement } from './message-time';
import { MessageLocationElement } from './message-location';
import { ChannelTimeElement } from './channel-time';
import { ChannelLoadingElement } from './channel-loading';
import { UnsupportMessageElement } from './messages/unsupported-message';
import { TextMessageElement } from './messages/text-message';
import { HDVoiceMessageElement } from './messages/hd-voice-message';
import { ImageMessageElement } from './messages/image-message';
import { GifMessageElement } from './messages/gif-message';
import { ShortVideoMessageElement } from './messages/short-video-message';
import { MessageSelectElement } from './message-select';
import { ReferenceMessageElement } from './messages/reference-message';
import { ModalDialogElement } from './modal/modal-dialog';
import { MessageBubbleElement } from './message-bubble';
import { FileMessageElement } from './messages/file-message';
import { CombineMessageElement } from './messages/combine-message';
import { ConnectionStatusElement } from './connection-status';
import { MultiChoiceMenuElement } from './multi-choice-menu';
import { InputReplyBarElement } from './input-reply-bar';
import { MessageSentStatusElement } from './message-sent-status';

/**
 * Component tag definitions
 */
export const Components = {
  ICON: 'nc-icon',
  ICON_CHANNEL_MUTED: 'nc-channel-muted-icon',
  ICON_CHANNEL_PINNED: 'nc-channel-pinned-icon',
  CHANNEL_LABEL: 'nc-channel-label',
  LATEST_MESSAGE: 'nc-latest-message',
  CHANNEL_UNREAD: 'nc-channel-unread',
  CHANNEL_LIST_ITEM: 'nc-channel-list-item',
  CHANNEL_TIME: 'nc-channel-time',
  CHANNEL_LOADING: 'nc-channel-loading',
  CHANNEL_LIST_MENU_ITEM: 'nc-channel-list-menu-item',
  CHANNEL_EMPTY: 'nc-channel-empty',
  CHANNEL_LIST_EMPTY: 'nc-channel-list-empty',
  MESSAGE_BUBBLE: 'nc-message-bubble',
  MESSAGE_LIST_MENU_ITEM: 'nc-message-list-menu-item',
  MESSAGE_TIME: 'nc-message-time',
  MESSAGE_SELECT: 'nc-message-select',
  MODAL_DIALOG: 'nc-modal-dialog',
  TEXT_MESSAGE: 'nc-text-message',
  HD_VOICE_MESSAGE: 'nc-hd-voice-message',
  IMAGE_MESSAGE: 'nc-image-message',
  UNSUPPORTED_MESSAGE: 'nc-unsupported-message',
  SHORT_VIDEO_MESSAGE: 'nc-short-video-message',
  FILE_MESSAGE: 'nc-file-message',
  REFERENCE_MESSAGE: 'nc-reference-message',
  COMBINE_MESSAGE: 'nc-combine-message',
  GIF_MESSAGE: 'nc-gif-message',
  MULTI_CHOICE_MENU: 'nc-multi-choice-menu',
  INPUT_REPLY_BAR: 'nc-input-reply-bar',
  MESSAGE_LOCATION: 'nc-message-location',
  MESSAGE_SENT_STATUS: 'nc-message-sent-status',
  CONNECTION_STATUS: 'nc-connection-status',
  READ_RECEIPT_MODAL: 'nc-read-receipt-modal',
};

/**
 * Native custom elements implemented with Lit; register them directly with customElements.define without a defineCustomElement wrapper.
 */
export const components: { [key: string]: CustomElementConstructor } = {
  [Components.CHANNEL_LIST_ITEM]: ChannelListItemElement,
  [Components.ICON]: IconElement,
  [Components.ICON_CHANNEL_MUTED]: ChannelMutedIconElement,
  [Components.ICON_CHANNEL_PINNED]: PinnedIconElement,
  [Components.CHANNEL_LABEL]: ChannelLabelElement,
  [Components.LATEST_MESSAGE]: LatestMessageElement,
  [Components.CHANNEL_UNREAD]: ChannelUnreadElement,
  [Components.CHANNEL_TIME]: ChannelTimeElement,
  [Components.CHANNEL_LIST_MENU_ITEM]: ChannelListMenuItemElement,
  [Components.CHANNEL_EMPTY]: ChannelEmptyElement,
  [Components.CHANNEL_LIST_EMPTY]: ChannelListEmptyElement,
  [Components.MESSAGE_LIST_MENU_ITEM]: MessageListMenuItemElement,
  [Components.MESSAGE_TIME]: MessageTimeElement,
  [Components.MESSAGE_LOCATION]: MessageLocationElement,
  [Components.CHANNEL_LOADING]: ChannelLoadingElement,
  [Components.UNSUPPORTED_MESSAGE]: UnsupportMessageElement,
  [Components.TEXT_MESSAGE]: TextMessageElement,
  [Components.HD_VOICE_MESSAGE]: HDVoiceMessageElement,
  [Components.IMAGE_MESSAGE]: ImageMessageElement,
  [Components.GIF_MESSAGE]: GifMessageElement,
  [Components.SHORT_VIDEO_MESSAGE]: ShortVideoMessageElement,
  [Components.MESSAGE_SELECT]: MessageSelectElement,
  [Components.REFERENCE_MESSAGE]: ReferenceMessageElement,
  [Components.MODAL_DIALOG]: ModalDialogElement,
  [Components.MESSAGE_BUBBLE]: MessageBubbleElement,
  [Components.FILE_MESSAGE]: FileMessageElement,
  [Components.COMBINE_MESSAGE]: CombineMessageElement,
  [Components.CONNECTION_STATUS]: ConnectionStatusElement,
  [Components.MULTI_CHOICE_MENU]: MultiChoiceMenuElement,
  [Components.INPUT_REPLY_BAR]: InputReplyBarElement,
  [Components.MESSAGE_SENT_STATUS]: MessageSentStatusElement,
  [Components.READ_RECEIPT_MODAL]: ReadReceiptModalElement,
};
