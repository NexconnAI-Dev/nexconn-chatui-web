import { ModalProvider } from './modal/modal-provider';
import { MentionUsersPanelProvider } from './mention-users-panel-provider';
import { ToastProvider } from './toast-provider';
import { EmojiPanelProvider } from './emoji-panel-provider';
import { ScrollbarThumbProvider } from './scrollbar-thumb-provider';
import { ModalTakePhotoProvider } from './modal/modal-take-photo-provider';
import { GreyMessageProvider } from './grey-message-provider';
import { FileTransferCtrlProvider } from './file-transfer-ctrl-provider';

// Lit provider components
import { ModalConfirmProvider } from './modal/modal-confirm-provider';
import { ModalAlertProvider } from './modal/modal-alert-provider';
import { ModalForwardingProvider } from './modal/modal-forwarding-provider';
import { ModalMediaMessageProvider } from './modal/modal-media-message-provider';
import { ModalCombineProvider } from './modal/modal-combine-provider';
import { ScrollbarProvider } from './scrollbar-provider';
import { ChannelDetailBarProvider } from './channel-detail-bar-provider';
import { MultiChoiceMenuProvider } from './multi-choice-menu-provider';
import { HDVoiceMessageProvider } from './hd-voice-message-provider';
import { ChannelDetailProvider } from './channel-detail-provider';
import { ChannelListContainerProvider } from './channel-list-container-provider';
import { ChatUIAppProvider } from './chat-ui-app-provider';
import { ChannelListProvider } from './channel-list-provider';
import { InputProvider } from './input-provider';
import { MessageListProvider } from './message-list-provider';

/**
 * Provider component tag definitions.
 */
export const InnerProviderTag = {
  GREY_MESSAGE_PROVIDER: 'nc-grey-message-provider',
  SCROLLBAR_PROVIDER: 'nc-scrollbar-provider',
  SCROLLBAR_THUMB_PROVIDER: 'nc-scrollbar-thumb-provider',
  MODAL_PROVIDER: 'nc-modal-provider',
  MODAL_CONFIRM_PROVIDER: 'nc-modal-confirm-provider',
  MODAL_ALERT_PROVIDER: 'nc-modal-alert-provider',
  MODAL_FORWARDING_PROVIDER: 'nc-modal-forwarding-provider',
  MODAL_MEDIA_MESSAGE_PROVIDER: 'nc-modal-media-message-provider',
  MODAL_COMBINE_MESSAGE_PROVIDER: 'nc-modal-combine-message-provider',
  MODAL_TAKE_PHOTO_PROVIDER: 'nc-modal-take-photo-provider',
  CHANNEL_LIST_CONTAINER_PROVIDER: 'nc-channel-list-container-provider',
  CHANNEL_LIST_PROVIDER: 'nc-channel-list-provider',
  CHANNEL_DETAIL_PROVIDER: 'nc-channel-detail-provider',
  InputProvider: 'nc-input-provider',
  MESSAGLISTPROVIDER: 'nc-message-list-provider',
  CHANNEL_DETAIL_BAR_PROVIDER: 'nc-channel-detail-bar-provider',
  EMOJI_PANEL_PROVIDER: 'nc-emoji-panel-provider',
  MULTI_CHOICE_MENU_PROVIDER: 'nc-multi-choice-menu-provider',
  MENTION_USERS_PANEL_PROVIDER: 'nc-mention-users-panel-provider',
  HD_VOICE_MESSAGE_PROVIDER: 'nc-hd-voice-message-privider',
  FileTransferCtrlProvider: 'nc-file-transfer-ctrl-provider',
  APP_PROVIDER: 'nc-chat-ui-app-provider',
  TOAST_PROVIDER: 'nc-toast-provider',
};

/**
 * Native custom element providers implemented with Lit.
 */
export const providers: { [key: string]: CustomElementConstructor } = {
  [InnerProviderTag.MODAL_PROVIDER]: ModalProvider,
  [InnerProviderTag.MENTION_USERS_PANEL_PROVIDER]: MentionUsersPanelProvider,
  [InnerProviderTag.TOAST_PROVIDER]: ToastProvider,
  [InnerProviderTag.EMOJI_PANEL_PROVIDER]: EmojiPanelProvider,
  [InnerProviderTag.SCROLLBAR_THUMB_PROVIDER]: ScrollbarThumbProvider,
  [InnerProviderTag.MODAL_TAKE_PHOTO_PROVIDER]: ModalTakePhotoProvider,
  [InnerProviderTag.GREY_MESSAGE_PROVIDER]: GreyMessageProvider,
  [InnerProviderTag.FileTransferCtrlProvider]: FileTransferCtrlProvider,
  [InnerProviderTag.MODAL_CONFIRM_PROVIDER]: ModalConfirmProvider,
  [InnerProviderTag.MODAL_ALERT_PROVIDER]: ModalAlertProvider,
  [InnerProviderTag.MODAL_FORWARDING_PROVIDER]: ModalForwardingProvider,
  [InnerProviderTag.MODAL_MEDIA_MESSAGE_PROVIDER]: ModalMediaMessageProvider,
  [InnerProviderTag.MODAL_COMBINE_MESSAGE_PROVIDER]: ModalCombineProvider,
  [InnerProviderTag.SCROLLBAR_PROVIDER]: ScrollbarProvider,
  [InnerProviderTag.CHANNEL_DETAIL_BAR_PROVIDER]: ChannelDetailBarProvider,
  [InnerProviderTag.MULTI_CHOICE_MENU_PROVIDER]: MultiChoiceMenuProvider,
  [InnerProviderTag.HD_VOICE_MESSAGE_PROVIDER]: HDVoiceMessageProvider,
  [InnerProviderTag.CHANNEL_DETAIL_PROVIDER]: ChannelDetailProvider,
  [InnerProviderTag.CHANNEL_LIST_CONTAINER_PROVIDER]: ChannelListContainerProvider,
  [InnerProviderTag.APP_PROVIDER]: ChatUIAppProvider,
  [InnerProviderTag.CHANNEL_LIST_PROVIDER]: ChannelListProvider,
  [InnerProviderTag.InputProvider]: InputProvider,
  [InnerProviderTag.MESSAGLISTPROVIDER]: MessageListProvider,
};
