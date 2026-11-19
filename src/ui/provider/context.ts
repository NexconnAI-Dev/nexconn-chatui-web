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
import { ConnectionStatusChangeEvent, ChannelSelectedEvent, ForwardingEvent, InnerEvent, ChatUIEvents, ModalForwardingType, ReactionDetailEvent } from '@lib/core/EventDefined';
import { NCChatUICode } from '../../enums/NCChatUICode';
import { openExternalUrl } from '../../helper/openExternalUrl';
import {
  MessageBubbleContentLayout,
  resolveCustomMessageBubbleContentLayout,
} from '../message-bubble-layout';

let _logger: ILogger;
let _ctx: ChatUIContext;
let reactionDetailModal: HTMLElement | null = null;

const closeReactionDetailModal = () => {
  reactionDetailModal?.remove();
  reactionDetailModal = null;
};

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
export interface SelectedGroupMember {
  name: string
  nickname?: string
  userId: string
  avatarUrl: string
}

export const selectedGroupMembers = new Signal<SelectedGroupMember[]>([]);

const selectedGroupMembersById = new Map<string, SelectedGroupMember>();
let selectedGroupMembersGeneration = 0;

export const getSelectedGroupMember = (userId: string): SelectedGroupMember | undefined => (
  selectedGroupMembersById.get(userId)
);

/** Notifies high-frequency name resolvers without serializing the full member list. */
export const selectedGroupMembersVersion = new Signal(0);

const setSelectedGroupMembers = (members: SelectedGroupMember[]): void => {
  selectedGroupMembersById.clear();
  members.forEach(member => selectedGroupMembersById.set(member.userId, member));
  selectedGroupMembers.value = members;
  selectedGroupMembersVersion.value += 1;
};

const updateSelectedGroupMembers = (
  users: Array<{ name: string; userId: string; avatarUrl: string }>,
  members: Array<{ userId: string; nickname?: string }>,
): void => {
  const membersById = new Map(members.map(member => [member.userId, member]));
  const nextMembers = users
    .filter(user => user.userId !== _ctx.userId)
    .map<SelectedGroupMember>(user => ({
      userId: user.userId,
      nickname: membersById.get(user.userId)?.nickname,
      name: user.name,
      avatarUrl: user.avatarUrl,
    }));

  setSelectedGroupMembers(nextMembers);
};

/**
 * Current user profile.
 */
export const currentUserProfile = new Signal<{
  name: string
  nickname?: string
  userId: string
  avatarUrl: string
} | undefined>(undefined);
let currentUserProfileGeneration = 0;

const _onConnectionStatusChange = async (e: ConnectionStatusChangeEvent) => {
  const { status } = e.data;
  if (status === ConnectionStatus.CONNECTED) {
    const context = _ctx;
    const generation = ++currentUserProfileGeneration;
    const userId = NCEngine.getCurrentUserId();
    const users = await context.appData.requestUserProfiles([userId]);
    if (context !== _ctx || generation !== currentUserProfileGeneration || userId !== context.userId) return;
    currentUserProfile.value = users[0] ? { ...users[0] } : undefined;
  };
}

const _onChannelSelected = async (evt: ChannelSelectedEvent) => {
  const context = _ctx;
  const generation = ++selectedGroupMembersGeneration;
  closeReactionDetailModal();
  const channelModel = evt.data?.model;
  // Update cached state.
  openedChannel.value = channelModel || null;
  unreadCountBottom.value = channelModel?.unreadCount || 0;
  updateSelectedGroupMembers([], []);

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
  const isCurrent = () => context === _ctx
    && generation === selectedGroupMembersGeneration
    && !!openedChannel.value?.channelIdentifier.isEqualTo(channelModel.channelIdentifier);

  // Fetch group members.
  const mems = await context.appData.reqGroupMembers(channelId);
  if (!isCurrent() || mems.length === 0) {
    return;
  }

  const users = await context.appData.requestUserProfiles(mems.map(item => item.userId));
  if (!isCurrent()) {
    // Recheck the open channel after the asynchronous request completes.
    return;
  }

  updateSelectedGroupMembers(users, mems);
};

/**
 * Resets UIModule state.
 */
export const destroyUserCache = async () => {
  currentUserProfileGeneration += 1;
  selectedGroupMembersGeneration += 1;
  currentUserProfile.value = undefined;
  closeReactionDetailModal();
  channelListSourceGeneration += 1;
  channelListGeneration += 1;
  loadingMoreChannels = false;
  channelList.value = [];
  channelListHasMore.value = false;
  sttStatusMap.value = {};
  sttTextMap.value = {};
  sttHiddenMap.value = {};
  sttErrorCodeMap.value = {};
  // Reset the open channel.
  openedChannel.value = null;
  // Reset the input content.
  if (textarea.value) {
    textarea.value.value = '';
  }
  // Reset the unread count.
  unreadCountBottom.value = 0;
  // Reset the group member list.
  updateSelectedGroupMembers([], []);
  // Update the environment userId.
  currentUserId.value = ctx().userId;
}

export function initProviderContext(ctx: ChatUIContext): void {
  _ctx = ctx;
  _logger = ctx.logger;
  currentUserProfileGeneration += 1;
  selectedGroupMembersGeneration += 1;
  currentUserProfile.value = undefined;
  updateSelectedGroupMembers([], []);
  channelListGeneration += 1;
  loadingMoreChannels = false;
  channelList.value = ctx.channelModule.getCachedChannelList();
  channelListHasMore.value = channelList.value.length >= 30;
  sttStatusMap.value = {};
  sttTextMap.value = {};
  sttHiddenMap.value = {};
  sttErrorCodeMap.value = {};

  // H5 unmounts the channel list while chatting; shared data must keep updating.
  ctx.addEventListener(InnerEvent.CHANNELS_LIST_RESET, (e) => {
    if (e.data.generation !== channelListSourceGeneration) return;
    const { list } = e.data;
    channelListGeneration += 1;
    loadingMoreChannels = false;
    channelList.value = [...list];
    channelListHasMore.value = list.length >= 30;
    list.forEach(syncOpenedChannel);
    ctx.channelModule.updateLatesMessageStatus(list);
  });
  ctx.addEventListener(InnerEvent.CHANNELS_ITEM_ORDER_CHANGE, (e) => {
    const list = [...channelList.value];
    e.data.forEach(({ model, order }) => {
      const index = list.findIndex(item => item.channelIdentifier.isEqualTo(model.channelIdentifier));
      if (index !== -1) list.splice(index, 1);
      list.splice(order, 0, model.clone());
      syncOpenedChannel(model);
    });
    channelList.value = list;
  });
  ctx.addEventListener(InnerEvent.CHANNELS_ITEM_CHANGE, (e) => {
    const list = [...channelList.value];
    e.data.forEach(model => {
      const index = list.findIndex(item => item.channelIdentifier.isEqualTo(model.channelIdentifier));
      if (index !== -1) list.splice(index, 1, model.clone());
      syncOpenedChannel(model);
    });
    channelList.value = list;
  });
  ctx.addEventListener(InnerEvent.CHANNELS_ITEM_DELETED, (e) => {
    channelList.value = channelList.value.filter(item =>
      !e.data.some(model => item.channelIdentifier.isEqualTo(model.channelIdentifier))
    );
  });
  ctx.addEventListener(InnerEvent.SPEECH_TO_TEXT_STATE_CHANGE, (e) => {
    const { messageUId, status, text, errorCode } = e.data;
    if (sttHiddenMap.value[messageUId]) return;
    sttStatusMap.value = { ...sttStatusMap.value, [messageUId]: status };
    const errors = { ...sttErrorCodeMap.value };
    if (errorCode !== undefined) errors[messageUId] = errorCode;
    else delete errors[messageUId];
    sttErrorCodeMap.value = errors;
    if (status === 'success') {
      sttTextMap.value = { ...sttTextMap.value, [messageUId]: text || '' };
    }
  });

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
export const channelListHasMore = new Signal(false);
let channelListSourceGeneration = 0;
let channelListGeneration = 0;
let loadingMoreChannels = false;

const syncOpenedChannel = (model: ChatUIChannelModel): void => {
  if (openedChannel.value?.channelIdentifier.isEqualTo(model.channelIdentifier)) {
    openedChannel.value = model.clone();
    unreadCountBottom.value = model.unreadCount;
  }
};

export const loadMoreChannels = async (): Promise<void> => {
  if (!channelListHasMore.value || loadingMoreChannels) return;
  const context = ctx();
  const generation = channelListGeneration;
  const lastChannel = channelList.value[channelList.value.length - 1] || null;
  loadingMoreChannels = true;
  try {
    const { hasMore, code, list } = await context.channelModule.getMoreChannelList(lastChannel);
    if (context !== _ctx || generation !== channelListGeneration) return;
    if (code === NCChatUICode.SUCCESS) {
      const additions = list.filter(item => !channelList.value.some(current =>
        current.channelIdentifier.isEqualTo(item.channelIdentifier)
      ));
      channelList.value = [...channelList.value, ...additions];
      channelListHasMore.value = hasMore;
      context.channelModule.updateLatesMessageStatus(list);
    }
  } finally {
    if (context === _ctx && generation === channelListGeneration) loadingMoreChannels = false;
  }
};

// Conversion display state belongs to the signed-in user, not a mounted message list.
export const sttStatusMap = new Signal<Record<string, 'converting' | 'success' | 'error'>>({});
export const sttTextMap = new Signal<Record<string, string>>({});
export const sttHiddenMap = new Signal<Record<string, boolean>>({});
export const sttErrorCodeMap = new Signal<Record<string, number>>({});

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
    const element = document.createElement(InnerProviderTag.MODAL_CONFIRM_PROVIDER) as HTMLElement & { content: string };
    element.content = e.data;
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
    const element = document.createElement(InnerProviderTag.MODAL_ALERT_PROVIDER) as HTMLElement & { content: string };
    element.content = e.data;
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

  ctx.addEventListener(ChatUIEvents.REACTIONS_DETAIL_EVENT, (e: ReactionDetailEvent) => {
    closeReactionDetailModal();
    const element = document.createElement(InnerProviderTag.MODAL_REACTIONS_DETAIL_PROVIDER) as HTMLElement & {
      message: ChatUIMessageModel;
      initialReactionId: string;
    };
    reactionDetailModal = element;
    element.addEventListener('cancel', () => {
      if (reactionDetailModal === element) {
        closeReactionDetailModal();
      }
    });
    element.message = e.data.message;
    element.initialReactionId = e.data.reactionId;
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
      return;
    }
    if (e.data.type === 'url') {
      openExternalUrl(e.data.address);
    }
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
    const generation = ++selectedGroupMembersGeneration;
    const users = await ctx.appData.requestUserProfiles(members.map(item => item.userId));
    if (ctx !== _ctx || generation !== selectedGroupMembersGeneration
      || !openedChannel.value || openedChannel.value.channelType !== ChannelType.GROUP || openedChannel.value.channelId !== groupId) {
      // Recheck the open channel after the asynchronous request completes.
      return;
    }

    updateSelectedGroupMembers(users, members);
  });

  ctx.addEventListener(InnerEvent.USER_PROFILES_UPDATE, (e) => {
    const profilesById = new Map(e.data.map(profile => [profile.userId, profile]));
    const self = profilesById.get(ctx.userId);
    if (self) {
      currentUserProfileGeneration += 1;
      currentUserProfile.value = { ...self };
    }

    let changed = false;
    const members = selectedGroupMembers.value.map(member => {
      const profile = profilesById.get(member.userId);
      if (!profile || (member.name === profile.name && member.avatarUrl === profile.avatarUrl)) return member;
      changed = true;
      return { ...member, name: profile.name, avatarUrl: profile.avatarUrl };
    });
    if (changed) {
      setSelectedGroupMembers(members);
    }
  });

}

interface MessageComponentDefinition {
  tag: string;
  bubbleContentLayout: MessageBubbleContentLayout;
}

const createMessageComponentDefinition = (
  tag: string,
  bubbleContentLayout: MessageBubbleContentLayout = MessageBubbleContentLayout.STANDARD,
): MessageComponentDefinition => ({ tag, bubbleContentLayout });

const messageComponentDefinitions: Record<string, MessageComponentDefinition> = {
  [MessageType.TEXT]: createMessageComponentDefinition(Components.TEXT_MESSAGE),
  [MessageType.IMAGE]: createMessageComponentDefinition(
    Components.IMAGE_MESSAGE,
    MessageBubbleContentLayout.ADAPTIVE,
  ),
  [MessageType.SHORT_VIDEO]: createMessageComponentDefinition(
    Components.SHORT_VIDEO_MESSAGE,
    MessageBubbleContentLayout.ADAPTIVE,
  ),
  [MessageType.FILE]: createMessageComponentDefinition(Components.FILE_MESSAGE),
  // The current reference renderer owns its compound quote/content spacing.
  [MessageType.REFERENCE]: createMessageComponentDefinition(
    Components.REFERENCE_MESSAGE,
    MessageBubbleContentLayout.EDGE_TO_EDGE,
  ),
  [MessageType.COMBINE]: createMessageComponentDefinition(Components.COMBINE_MESSAGE),
  [MessageType.HD_VOICE]: createMessageComponentDefinition(InnerProviderTag.HD_VOICE_MESSAGE_PROVIDER),
  [MessageType.GIF]: createMessageComponentDefinition(
    Components.GIF_MESSAGE,
    MessageBubbleContentLayout.ADAPTIVE,
  ),
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
export const regMessageTypeComponentTag = (
  messageType: string,
  tag: string,
  disableDefaultBubblePadding = false,
) => {
  messageComponentDefinitions[messageType] = createMessageComponentDefinition(
    tag,
    resolveCustomMessageBubbleContentLayout(disableDefaultBubblePadding),
  );
};

export const getMessageComponentTag = (messageType: string): string => {
  return messageComponentDefinitions[messageType]?.tag || Components.UNSUPPORTED_MESSAGE;
};

export const getMessageBubbleContentLayout = (
  messageType: string,
): MessageBubbleContentLayout => messageComponentDefinitions[messageType]?.bubbleContentLayout
  || MessageBubbleContentLayout.STANDARD;

/**
 * Checks whether a message type is rendered as a grey message.
 * @param messageType
 * @returns
 */
export const isGreyMessage = (messageType: string): boolean => {
  return !messageComponentDefinitions[messageType];
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
