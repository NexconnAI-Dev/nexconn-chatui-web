import { ILogger } from '@nexconn/engine';
import { Signal, derive, watch } from '../signal';
import { ChatUIContext } from '../../core/ChatUIContext';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { LanguagePackEntries } from '../../languages';
import { $has, $t, $tt, lang } from '../i18n';
import { ChannelType, ConnectionStatus, NCEngine, MessageType, TextMessageContent, ReferenceMessageContent, SentStatus } from '@nexconn/chat';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { Components } from '../component';
import { InnerProviderTag } from '.';
import { ChatUICommand } from "../../enums/ChatUICommand";
import { ConnectionStatusChangeEvent, ChannelListItemChangeEvent, ChannelSelectedEvent, ForwardingEvent, InnerEvent, ChatUIEvents, ModalForwardingType } from '@lib/core/EventDefined';

let _logger: ILogger;
let _ctx: ChatUIContext;

const currentUserId = new Signal<string>('')
/**
 * Injects environment state into the two top-level components.
 */
export const setEnvInfo = () => {
  // Keep CURRENT_USER_ID reactive so it updates when the user changes.
  currentUserId.value = ctx().userId;
}
/**
 * Whether the channel bar is enabled.
 */
export const showChannelBar = new Signal(true);

/**
 * Whether the channel detail back button is enabled.
 */
export const showChannelDetailBack = new Signal(true);

/**
 * Channel bar title.
 */
export const channelBarTitle = new Signal<string | undefined>(undefined);

/**
 * Open channel.
 */
export const openedChannel = new Signal<ChatUIChannelModel | null>(null);
/**
 * Textarea DOM element used to read or set content for drafts and message editing.
 */
export const textarea: Signal<HTMLTextAreaElement> = new Signal<any>(undefined);
/**
 * Unread count for the bottom-position control.
 */
export const unreadCountBottom = new Signal<number>(0);

/**
 * Members of the selected group channel.
 * @description Excludes the current user.
 */
export const selectedGroupMembers = new Signal<{
  name: string
  nickname?: string
  userId: string
  avatarUrl: string
}[]>([]);

/**
 * Current user profile.
 */
export const currentUserProfile = new Signal<{
  name: string
  nickname?: string
  userId: string
  avatarUrl: string
} | undefined>(undefined);

const _onConnectionStatusChange = async (e: ConnectionStatusChangeEvent) => {
  const { status } = e.data;
  if (status === ConnectionStatus.CONNECTED) {
    const userId = NCEngine.getCurrentUserId();
    const users = await _ctx.appData.requestUserProfiles([userId]);
    currentUserProfile.value = users[0];
  };
}

const _onChannelSelected = async (evt: ChannelSelectedEvent) => {
  const channelModel = evt.data?.model;
  // Update cached state.
  openedChannel.value = channelModel || null;
  selectedGroupMembers.value = [];

  // Stop audio playback when switching channels.
  ctx().audioPlayer.pause();

  if (!channelModel) {
    return;
  }

  // Update the group member list.
  const { channelType, channelId } = channelModel;
  if (channelType !== ChannelType.GROUP) {
    return;
  }

  // Fetch group members.
  const mems = await _ctx.appData.reqGroupMembers(channelId);
  if (mems.length === 0) {
    return;
  }

  const users = await _ctx.appData.requestUserProfiles(mems.map(item => item.userId));
  if (!openedChannel.value || !channelModel.channelIdentifier.isEqualTo(openedChannel.value.channelIdentifier)) {
    // Recheck the open channel after the asynchronous request completes.
    return;
  }

  selectedGroupMembers.value = users.filter(item => item.userId !== _ctx.userId).map((item) => {
    const index = mems.findIndex((mem) => mem.userId === item.userId)
    return {
      userId: item.userId,
      nickname: mems[index].nickname,
      name: item.name,
      avatarUrl: item.avatarUrl,
    }
  });
};

/**
 * Resets UIModule state.
 */
export const destroyUserCache = async () => {
  // Reset the open channel.
  openedChannel.value = null;
  // Reset the input content.
  if (textarea.value) {
    textarea.value.value = '';
  }
  // Reset the unread count.
  unreadCountBottom.value = 0;
  // Reset the group member list.
  selectedGroupMembers.value = [];
  // Update the environment userId.
  currentUserId.value = ctx().userId;
}

export function initProviderContext(ctx: ChatUIContext): void {
  _ctx = ctx;
  _logger = ctx.logger;

  _ctx.addEventListener(ChatUIEvents.CHANNEL_SELECTED, _onChannelSelected);
  // Fetch the connected user's profile.
  _ctx.addEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, _onConnectionStatusChange);
  // Reset state when the signed-in user changes.
  _ctx.addEventListener(InnerEvent.DESTROY_USER_CACHE, destroyUserCache);
  // Listen for channel bar visibility changes.
  _ctx.addEventListener(InnerEvent.CHANNEL_BAR_SWITCH_CHANGE, (e) => {
    showChannelBar.value = e.data;
  });
  // Listen for channel detail back button visibility changes.
  _ctx.addEventListener(InnerEvent.CHANNEL_DETAIL_BACK_SWITCH_CHANGE, (e) => {
    showChannelDetailBack.value = e.data;
  });
  // Listen for channel bar title changes.
  _ctx.addEventListener(InnerEvent.CHANNEL_BAR_TITLE_CHANGE, (e) => {
    channelBarTitle.value = e.data;
  });
  initModalListener(_ctx);
}

export const ctx = () => _ctx;
export const logger = () => _logger;

/**
 * Channel list data.
 */
export const channelList = new Signal<ChatUIChannelModel[]>([]);

/**
 * Message list data.
 */
export const messageList = new Signal<ChatUIMessageModel[]>([]);

/**
 * Multi-select mode.
 */
export const multiChoiceMode = new Signal(false);

/**
 * Messages selected in multi-select mode.
 */
export const selectedMessages = new Signal<ChatUIMessageModel[]>([]);

export const selectedMessageUids = new Signal<string[]>([]);
export const selected = new Signal<boolean>(true);

// Clear selected messages when multi-select mode changes.
watch(multiChoiceMode, () => {
  selectedMessages.value = [];
  selectedMessageUids.value = [];
  selected.value = true;
});

// Synchronize selectedMessages when selectedMessageUids changes.
watch(selectedMessageUids, () => {
  const msgList: ChatUIMessageModel[] = [];
  selectedMessageUids.value.forEach((uid) => {
    const msg = messageList.value.find((m) => {
      if (m.messageId) return m.messageId === uid;
      return `${m.transactionId}` === uid;
    });
    if (msg) msgList.push(msg);
  });
  selectedMessages.value = msgList;
});

/** Number of selected messages. */
export const selectedCount = derive(() => selectedMessages.value.length);
selectedCount.dependOn(selectedMessages);

/**
 * Message being replied to.
 */
export const replyMessage = new Signal<ChatUIMessageModel | null>(null);

/**
 * Gets the message text or a short description of its message type.
 * @param message
 * @returns
 */
export const getMessageDesc = (message: ChatUIMessageModel): string => {
  const messageType = message.messageType;
  if (messageType === MessageType.TEXT || messageType === MessageType.REFERENCE) {
    return (message.content as TextMessageContent | ReferenceMessageContent).text;
  }

  let key = `message-type.${messageType}` as keyof LanguagePackEntries;
  if (!$has(key)) {
    key = 'message-type.unknown';
  }

  return $t(key).value;
};

const appendChild = (ctx: ChatUIContext, ele: HTMLElement) => {
  let elementParent = document.body;
  if (ctx.modalContainerId && document.getElementById(ctx.modalContainerId)) {
    elementParent = document.getElementById(ctx.modalContainerId)!;
  }
  elementParent.appendChild(ele);
}
/**
 * Registers modal event listeners.
 * @param ctx
 */
export const initModalListener = (ctx: ChatUIContext): void => {
  ctx.addEventListener(ChatUIEvents.CONFIRM_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_CONFIRM_PROVIDER);
    element.addEventListener('cancel', () => {
      e.sendResult(false);
      element.remove();
    })
    element.addEventListener('confirm', () => {
      e.sendResult(true);
      element.remove();
    });

    appendChild(ctx, element)
  });

  ctx.addEventListener(ChatUIEvents.ALERT_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_ALERT_PROVIDER);
    element.addEventListener('cancel', (event) => {
      element.remove();
    });

    appendChild(ctx, element);
  });

  ctx.addEventListener(ChatUIEvents.FORWARDING_EVENT, (e: ForwardingEvent) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_FORWARDING_PROVIDER);
    element.addEventListener('cancel', () => {
      e.sendResult({ confirm: false });
      element.remove();
    })
    element.addEventListener('confirm', (event: any) => {
      e.sendResult({ confirm: true, list: event.detail[0].list });
      element.remove();
    });
    appendChild(ctx, element);
  });

  ctx.addEventListener(ChatUIEvents.MEDIA_MESSAGE_MODAL_EVENT, (e) => {
    const element: any = document.createElement(InnerProviderTag.MODAL_MEDIA_MESSAGE_PROVIDER);
    element.addEventListener('cancel', () => {
      element.remove();
    });
    element.addEventListener('download', () => {
      ctx.emit(new ChatUIEvent(ChatUIEvents.DOWNLOAD_LINK_EVENT, e.data));
    });
    element.message = e.data;
    appendChild(ctx, element);
  });

  ctx.addEventListener(ChatUIEvents.COMBINE_MESSAGE_MODAL_EVENT, (e) => {
    const element: any = document.createElement(InnerProviderTag.MODAL_COMBINE_MESSAGE_PROVIDER);
    element.addEventListener('cancel', (event: any) => {
      ctx.audioPlayer.pause();
      element.remove();
    });
    element.addEventListener('download', (event: any) => {
      ctx.emit(new ChatUIEvent(ChatUIEvents.DOWNLOAD_LINK_EVENT, event.detail[0]));
    });
    element.message = e.data;
    appendChild(ctx, element);
  });

  ctx.addEventListener(ChatUIEvents.TAKE_PHOTO_MODAL_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_TAKE_PHOTO_PROVIDER);
    // Cancel.
    element.addEventListener('cancel', (event: any) => {
      element.remove();
    });
    appendChild(ctx, element);
  });

  // Handle email and link events from text messages.
  ctx.addEventListener(ChatUIEvents.MESSAGE_LINK_CLICK, (e) => {
    if (e.data.type === 'mail') {
      location.href = `mailto:${e.data.address}`;
      return
    }
    window.open(e.data.address);
  });

  ctx.addEventListener(InnerEvent.GROUP_MEMBERS_UPDATE, async (e) => {
    if (!openedChannel.value) {
      return;
    }

    const { groupId, members } = e.data;

    const { channelType, channelId } = openedChannel.value;
    if (channelType !== ChannelType.GROUP || channelId !== e.data.groupId) {
      return;
    }

    // Update the group member list.
    const users = await _ctx.appData.requestUserProfiles(members.map(item => item.userId));
    if (!openedChannel.value || openedChannel.value.channelType !== ChannelType.GROUP || openedChannel.value.channelId !== groupId) {
      // Recheck the open channel after the asynchronous request completes.
      return;
    }

    selectedGroupMembers.value.splice(0, selectedGroupMembers.value.length, ...users.filter(item => item.userId !== _ctx.userId).map((item, index) => ({
      userId: item.userId,
      nickname: members[index].nickname,
      name: item.name,
      avatarUrl: item.avatarUrl,
    })));
  });

  /** Synchronize the open channel when its cache entry changes so asynchronous profile updates refresh the UI. */
  ctx.addEventListener(InnerEvent.CHANNELS_ITEM_CHANGE, (e: ChannelListItemChangeEvent) => {
    if (!openedChannel.value) {
      return;
    }

    const changed = e.data.find((item) => item.channelIdentifier.isEqualTo(openedChannel.value!.channelIdentifier));
    if (!changed) {
      return;
    }
    openedChannel.value = changed.clone();
  });
}

const messageComponentTags: Record<string, string> = {
  [MessageType.TEXT]: Components.TEXT_MESSAGE,
  [MessageType.IMAGE]: Components.IMAGE_MESSAGE,
  [MessageType.SHORT_VIDEO]: Components.SHORT_VIDEO_MESSAGE,
  [MessageType.FILE]: Components.FILE_MESSAGE,
  [MessageType.REFERENCE]: Components.REFERENCE_MESSAGE,
  [MessageType.COMBINE]: Components.COMBINE_MESSAGE,
  [MessageType.HD_VOICE]: InnerProviderTag.HD_VOICE_MESSAGE_PROVIDER,
  [MessageType.GIF]: Components.GIF_MESSAGE,
};

const customMessageDigestHandlers: Map<string, (message: ChatUIMessageModel, language: string) => string> = new Map();

/**
 * Sets the digest function for a custom message.
 * @param messageType - Message type.
 * @param getContent - Hook that returns grey message content for the message list.
 * @param digest - Hook that returns a grey message digest for the channel's last message.
 */
export const setCustomMessageDigestHandler = (
  messageType: string,
  digest: (message: ChatUIMessageModel, language: string) => string,
) => {
  customMessageDigestHandlers.set(messageType, digest);
}

// Register recalled messages as grey messages.
// TODO: Determine which other built-in messages should be registered as grey messages.
setCustomMessageDigestHandler('RC:RcCmd', (message) => {
  if (message.senderUserId === _ctx.userId) {
    return $tt('message.list.deleted.by.self')
  }
  const name = _ctx.appData.getUserProfile(message.senderUserId).name
  return $tt('message.list.deleted.by.other', name)
})

setCustomMessageDigestHandler('RC:RcNtf', (message) => {
  if (message.senderUserId === _ctx.userId) {
    return $tt('message.list.deleted.by.self')
  }
  const name = _ctx.appData.getUserProfile(message.senderUserId).name
  return $tt('message.list.deleted.by.other', name)
})

/**
 * Registers a message renderer component tag.
 * @param messageType
 * @param tag
 */
export const regMessageTypeComponentTag = (messageType: string, tag: string) => {
  messageComponentTags[messageType] = tag;
};

export const getMessageComponentTag = (messageType: string): string => {
  return messageComponentTags[messageType] || Components.UNSUPPORTED_MESSAGE;
};

/**
 * Checks whether a message type is rendered as a grey message.
 * @param messageType
 * @returns
 */
export const isGreyMessage = (messageType: string): boolean => {
  return !messageComponentTags[messageType];
};

/**
 * Forwards messages.
 * @description Opens a confirmation modal and forwards according to the user's selection.
 * @param forwardType - Forwarding type.
 * @returns `true` when the user confirms, or `false` when the user cancels.
 */
export const forwarding = async (forwardType: ModalForwardingType, messages: ChatUIMessageModel[]): Promise<boolean> => {
  // Request confirmation.
  const evt: ForwardingEvent = new ChatUIEvent(ChatUIEvents.FORWARDING_EVENT, forwardType);
  // Notify the application; show the built-in modal when it does not handle the event.
  _ctx.emit(evt);
  // Wait for the application result.
  const { confirm, list } = await evt.awaitResult();
  if (!confirm || !(list instanceof Array) || list.length === 0) {
    // The user canceled or the application returned invalid data.
    // TODO: Validate data because the application can intercept this event.
    return false;
  }

  if (forwardType === ModalForwardingType.SINGLE) {
    // Forward messages individually.
    list.forEach((item) => _ctx.message.forward(item.channelIdentifier, messages.slice()));
  } else {
    // Forward as a combined message.
    list.forEach((item) => _ctx.message.sendCombineMessage(item.channelIdentifier, messages.slice()));
  }

  // Show the forwarding success toast.
  _ctx.emit(new ChatUIEvent(ChatUIEvents.TOAST_EVENT, {
    message: _ctx.i18n.format('toast.forward.success'),
    showIcon: true,
  }));

  // Forwarding completed.
  return true;
}

/**
 * Determines whether to show the message status.
 * 1. Hide it when the message does not exist.
 * 2. Hide it for messages sent by another user.
 * 3. Hide it for recalled messages.
 * @param msg
 * @returns
 */
export const handleShowSentStatus = (msg: ChatUIMessageModel | null): boolean => {
  if (!msg) return false
  // if (msg.messageType === MessageType.RECALL || msg.messageType === MessageType.RECALL_NOTIFICATION_MESSAGE) {
  //   return false;
  // }

  const isSelf = msg.senderUserId === _ctx.userId;

  if (_ctx.store.getCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE) && isSelf) return true
  if (
    (msg.sentStatus === SentStatus.FAILED || msg.sentStatus === SentStatus.SENDING) &&
    isSelf
  ) return true

  return false
}

/**
 * Gets the message digest.
 */
export const getMessageDigest = (message: ChatUIMessageModel | null): string => {
  if (!message) {
    return ' '
  }

  // Compute built-in message digests.

  const { messageType, content } = message;
  if (messageType === MessageType.TEXT || messageType === MessageType.REFERENCE) {
    return (content as TextMessageContent | ReferenceMessageContent).text;
  }

  const messageTypes: string[] = [
    MessageType.IMAGE,
    MessageType.GIF,
    MessageType.HD_VOICE,
    MessageType.FILE,
    MessageType.SHORT_VIDEO,
    MessageType.COMBINE,
  ];
  if (messageTypes.includes(messageType)) {
    const name = `message-type.${messageType}` as keyof LanguagePackEntries
    return $tt(name)
  }

  // Compute custom message digests.
  if (!customMessageDigestHandlers.has(messageType)) {
    return $tt('message-type.unknown')
  }
  const digest = customMessageDigestHandlers.get(messageType)!;
  return digest(message, lang.value);
}
