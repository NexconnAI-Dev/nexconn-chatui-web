import { derive, Signal } from '../signal';
import { ctx, getMessageDesc, replyMessage, selectedGroupMembers } from './context';
import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { $tt } from '../i18n';
import {
  GIFMessageContent, SendMessageParams, MessageType, ImageMessageContent,
  ChannelType, MentionedType,
  TextMessageContent,
  ReferenceMessageContent,
  MentionedInfo,
  FileMessageContent,
  ShortVideoMessageContent,
  Helper,
  NCEngine,
} from '@nexconn/chat';
import { ImageEmoji } from '@lib/modules/InputModule';
import { ChatUIChannelModel } from '@lib/models/NCUIChannelModel';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';

/** Whether to show the secondary menu. */
export const secondaryVisible = new Signal(false);
/** Whether to show the emoji panel. */
export const showEmoji = new Signal(false);
/** Whether to show the mention list. */
export const showAtList = new Signal(false);
/** Literal mention text keyed by user ID. */
const mentionedUsers: Map<string, string> = new Map();
/** Whether the mention-all marker is present. */
let atAll = false;


/**
 * Clears cached mention information.
 */
export const clearMentionedInfo = () => {
  atAll = false;
  mentionedUsers.clear();
};

/**
 * Adds a mentioned user.
 * @param userId
 * @param textarea
 * @returns
 */
export const addMentionedUser = (
  userId: string,
  textarea: HTMLTextAreaElement,
  prefix: boolean = false
) => {
  const groupMembers = selectedGroupMembers.value;
  const user = groupMembers.find((member) => member.userId === userId);
  if (!user) {
    return;
  }

  hidePrompt();
  const name = user.nickname || user.name;
  mentionedUsers.set(userId, `@${name}`);
  textarea.focus();
  const txt = prefix ? `@${name} ` : `${name} `;
  textarea.setRangeText(txt, textarea.selectionStart, textarea.selectionEnd, 'end');
};

export const handleAtAll = (textarea: HTMLTextAreaElement) => {
  atAll = true;
  hidePrompt();

  textarea.focus();
  textarea.setRangeText(`${$tt('input.mentioned.all')} `, textarea.selectionStart, textarea.selectionEnd, 'end');
};

/** Hides input-related popups. */
export const hidePrompt = () => {
  secondaryVisible.value = false;
  showEmoji.value = false;
  showAtList.value = false;
};

export const showEmojiPanel = () => {
  showEmoji.value = true;
};

export const sendImageEmoji = (evt: CustomEvent<ImageEmoji>, model: ChatUIChannelModel) => {
  hidePrompt();
  const { detail } = evt;
  const { url, imageThumbnail, gifInfo } = detail;
  if (imageThumbnail) {
    const { thumbnail, thunbnailWidth, thunbnailHeight } = imageThumbnail;
    const params = new SendMessageParams<ImageMessageContent>({
      thumbnailBase64: thumbnail,
      remoteUrl: url,
      thumWidth: thunbnailWidth,
      thumHeight: thunbnailHeight,
    }, MessageType.IMAGE);
    ctx().message.sendMessage(model.channelIdentifier, params);
  } else {
    const { size, width, height } = gifInfo!;
    const params = new SendMessageParams<GIFMessageContent>({
      dataSize: size,
      width,
      height,
      remoteUrl: url,
    }, MessageType.GIF);
    ctx().message.sendMessage(model.channelIdentifier, params);
  }
};

export const insertChatEmoji = (evt: CustomEvent, textarea: HTMLTextAreaElement) => {
  textarea.focus();
  textarea.setRangeText(evt.detail, textarea.selectionStart, textarea.selectionEnd, 'end');
  hidePrompt();
  // Send the typing status.
  ctx().channelModule.sendTypingStatus()
};

const pickFile = (filter: string, handle: (files: File[]) => void) => {
  const element = document.createElement('input');
  element.type = 'file';
  element.accept = filter;
  element.multiple = true;
  element.onchange = () => {
    handle(Array.from(element.files || []));
  };
  // Listen for cancel because TypeScript DOM types do not yet include input.oncancel.
  element.addEventListener('cancel', () => {
    handle([]);
  });
  element.click();
}

const pickFileOnSafari = (filter: string, handle: (files: File[]) => void) => {
  const element = document.createElement('input');
  element.type = 'file';
  element.accept = filter;
  element.multiple = true;
  // Safari handles temporary file inputs more reliably when they are attached to the body.
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.opacity = '0';
  element.style.pointerEvents = 'none';
  document.body.appendChild(element);


  let handled = false;
  const pendingTimeouts: ReturnType<typeof globalThis.setTimeout>[] = [];

  const clearPendingTimeouts = () => {
    for (const id of pendingTimeouts) {
      globalThis.clearTimeout(id);
    }
    pendingTimeouts.length = 0;
  };

  const cleanup = () => {
    clearPendingTimeouts();
    globalThis.removeEventListener('focus', onWindowFocus, true);
    element.onchange = null;
    element.removeEventListener('cancel', finalizeCancel);
    if (element.parentNode) {
      element.remove();
    }
  };

  const readFiles = () => Array.from(element.files || []);

  const finalizeSuccess = () => {
    if (handled) {
      return;
    }
    const files = readFiles();
    if (files.length === 0) {
      // Do not mark an empty result as handled; Safari may dispatch onchange later.
      return;
    }
    handled = true;
    cleanup();
    handle(files);
  };

  const finalizeCancel = () => {
    if (handled) {
      return;
    }
    handled = true;
    cleanup();
    handle([]);
  };

  const onWindowFocus = () => {
    clearPendingTimeouts();
    const delays = [0, 50, 100, 200, 400, 700, 1100, 1700, 2500];
    for (const ms of delays) {
      pendingTimeouts.push(
        globalThis.setTimeout(finalizeSuccess, ms),
      );
    }
    // Process files that arrive after the last poll, or finalize an empty selection.
    pendingTimeouts.push(
      globalThis.setTimeout(() => {
        if (readFiles().length > 0) {
          finalizeSuccess();
        } else {
          finalizeCancel();
        }
      }, 2800),
    );
  };

  element.value = '';
  // Safari may delay onchange, so check for files when the window regains focus.
  globalThis.addEventListener('focus', onWindowFocus, true);
  element.onchange = finalizeSuccess;
  element.addEventListener('cancel', finalizeCancel);
  element.click();
}

function isSafari(): boolean {
  // 1. Use feature detection as a quick WebKit check.
  const isWebKit = 'GestureEvent' in window;

  // 2. Return early for non-WebKit browsers.
  if (!isWebKit) return false;

  // 3. Use the user agent to exclude Chrome and other non-Safari browsers.
  const ua = navigator.userAgent;
  const isSafariUA = /Safari/.test(ua) && !/Chrome|CriOS|Edg|FxiOS|OPiOS/i.test(ua);

  // 4. Confirm with navigator.vendor.
  const isAppleVendor: boolean = Boolean(navigator.vendor) && navigator.vendor.indexOf('Apple') > -1;

  // Return the final result.
  return isSafariUA && isAppleVendor;
}

/** File picker implementation for the current browser. */
export const pickFiles = isSafari() ? pickFileOnSafari : pickFile;

/**
 * Shows the input box secondary menu.
 * @param event
 * @param dom
 */
export const showInputBoxSecondaryMenu = (event: MouseEvent, dom: HTMLElement) => {
  dom.style.bottom = '50px';
  secondaryVisible.value = true;
};

/**
 * Whether Shift is pressed.
 */
let shiftDown = false;

/**
 * Handles keydown events.
 * @param e
 */
export const onKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Backspace':
      hidePrompt();
      break;
    case 'Shift':
      shiftDown = true;
      break;
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowDown':
      break;
    default:
      break;
  }
};

/**
 * Handles the Enter shortcut for sending.
 * Runs during keydown because Safari's keypress support is unreliable.
 */
export const handleEnterOnKeyDown = (
  e: KeyboardEvent,
  hidden: HTMLDivElement,
  container: HTMLDivElement,
  bar: HTMLDivElement
) => {
  if (e.key === 'Enter') {
    _handleEnter(e, hidden, container, bar);
  }
};

/**
 * Handles keyup events.
 * @param e
 */
export const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Shift') {
    shiftDown = false;
  }
};

export const handleInput = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, event: InputEvent) => {
  const value = textarea.value;
  resizeTextarea(textarea, hidden, container);

  // Safari may emit input without keypress when Shift + 2 inserts @.
  // Use the inserted text to decide whether to show the mention panel.
  const insertedText = event.data ?? '';
  const shouldShowAtList = event.inputType === 'insertText' && insertedText.includes('@');
  if (shouldShowAtList) {
    const channel = ctx().channelModule.getOpenedChannelModel();
    if (channel?.channelIdentifier.channelType === ChannelType.GROUP) {
      hidePrompt();
      showAtList.value = true;
    }
  } else {
    showAtList.value = false;
  }

  // Update mentionedUsers because text can change at any position.
  mentionedUsers.forEach((mentionText, userId) => {
    if (!value.includes(mentionText)) {
      mentionedUsers.delete(userId);
    }
  });

  // Check whether @all is still present.
  if (atAll) {
    const atAllTag = `@${$tt('input.mentioned.all')}`;
    if (!value.includes(atAllTag)) {
      atAll = false;
    }
  }

  ctx().channelModule.sendTypingStatus();
}

/**
 * Adjusts the message list so the input does not cover the last message.
 * When input height changes at the bottom, update the scroll position.
 */
export const adjustMessageListScroll = () => {
  requestAnimationFrame(() => {
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL));
  });
};

const textareaHeights = new WeakMap<HTMLTextAreaElement, number>();

export const resizeTextarea = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, deferred = false) => {
  if (!textarea.isConnected) return;
  const textareaWidth = textarea.offsetWidth;
  if (textareaWidth === 0) {
    if (!deferred) requestAnimationFrame(() => resizeTextarea(textarea, hidden, container, true));
    return;
  }
  // Mirror content into hidden and add a marker after a trailing newline to update its height.
  hidden.textContent = textarea.value.endsWith('\n') ? `${textarea.value}.` : textarea.value;

  // Measure without a scrollbar so removing text can shrink the field again.
  textarea.style.overflowY = 'hidden';
  // Match the text area rather than its padding box for accurate line wrapping.
  const style = getComputedStyle(textarea);
  const textWidth = textarea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  hidden.style.font = style.font;
  hidden.style.lineHeight = style.lineHeight;
  hidden.style.width = `${textWidth}px`;

  const lineHeight = parseFloat(style.lineHeight);
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  // Use the CSS limit so measurement and rendering agree on the maximum height.
  const maxHeight = parseFloat(style.maxHeight);
  const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  const containerStyle = getComputedStyle(container);
  const containerPadding = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

  // Measure content height from the hidden div's scrollHeight.
  // The hidden div has no padding, so scrollHeight is the content height.
  const contentHeight = hidden.scrollHeight;

  // Calculate the line count, rounded up with a minimum of one line.
  const lineCount = Math.max(1, Math.ceil(contentHeight / lineHeight));

  const fullHeight = lineHeight * lineCount + padding;
  const finalHeight = Math.min(fullHeight, maxHeight);

  textarea.style.height = `${finalHeight}px`;
  container.style.height = `${finalHeight + margin + containerPadding}px`;

  // Scroll only when the complete text exceeds the visible height.
  if (fullHeight > maxHeight) {
    textarea.style.overflowY = 'auto';
    // At the end, show four complete lines plus the 6px preview allowed by CSS;
    // leave scrolling elsewhere to the caret.
    if (textarea.selectionStart === textarea.value.length && textarea.selectionEnd === textarea.value.length) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  } else {
    textarea.scrollTop = 0;
  }

  // Adjust the scroll position only when the height changes.
  if (textareaHeights.get(textarea) !== finalHeight) {
    textareaHeights.set(textarea, finalHeight);
    // Adjust the message list scroll position.
    adjustMessageListScroll();
  }
  if (!deferred) {
    requestAnimationFrame(() => {
      if (textarea.isConnected && textarea.offsetWidth !== textareaWidth) {
        resizeTextarea(textarea, hidden, container, true);
      }
    });
  }
};

/**
 * Resets the input content and element dimensions.
 */
export const resetTextareaValue = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement, value?: string) => {
  textarea.value = value || '';
  // Restoring a draft starts at the top. Otherwise assigning value leaves the
  // caret at the end, and resizing or focusing scrolls to the last lines.
  textarea.setSelectionRange(0, 0);
  resizeTextarea(textarea, hidden, container);
  textarea.scrollTop = 0;
};

const isComposingInput = (e: KeyboardEvent): boolean => e.isComposing || e.keyCode === 229;

/**
 * Core message sending logic.
 */
export const sendMessage = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement) => {
  const context = ctx();
  const model = context.channelModule.getOpenedChannelModel()!;
  if (!model) {
    return;
  }

  const content = textarea.value;
  if (!content.trim().length) {
    return;
  }

  const mentionedType = atAll ? MentionedType.ALL : MentionedType.USERS;

  // Build the message.
  let params: SendMessageParams<any>;
  if (replyMessage.value) {
    const referMsgContent: ReferenceMessageContent = Helper.wrapAsReferenceMessageContent(replyMessage.value.message, content);
    params = new SendMessageParams<ReferenceMessageContent>(referMsgContent, MessageType.REFERENCE);
  } else {
    params = new SendMessageParams<TextMessageContent>({
      text: content,
    }, MessageType.TEXT);
  }

  const isMentioned = atAll || mentionedUsers.size > 0;

  if (isMentioned) {
    params.content.mentionedInfo = {
      type: mentionedType,
      userIdList: Array.from(mentionedUsers.keys()),
    } as MentionedInfo
  }
  const maxLength = context.input.inputMaxLength;
  if (params.content.text.length > maxLength) {
    context.alert('alert.send.message.maxcount', maxLength);
    return
  }
  context.message.sendMessage(model.channelIdentifier, params);

  replyMessage.value = null;
  // Clear the content and reset the height.
  clearMentionedInfo();
  textarea.value = '';
  resizeTextarea(textarea, hidden, container);
}

const _handleEnter = (e: KeyboardEvent, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement) => {
  const target = e.target as HTMLTextAreaElement;
  if (isComposingInput(e)) {
    return;
  }

  if (shiftDown) {
    // Preserve the normal newline behavior.
    return;
  }

  // Prevent the default event.
  e.preventDefault();
  sendMessage(target, hidden, container, bar);
}

export const onPaste = (event: ClipboardEvent) => {
  const paste: DataTransfer | null = event.clipboardData;
  if (!paste) {
    return;
  }

  if (paste.files.length === 0) {
    return;
  }

  event.preventDefault();

  const context = ctx();
  const model = context.channelModule.getOpenedChannelModel()!;

  // Process file data.
  const files = Array.from(paste.files);
  if (files.length > 100) {
    context.alert('alert.pickfiles.maxcount', '100');
    return;
  }

  const validFiles = files.filter((file) => file.type !== '' && file.size > 0);
  if (validFiles.length === 0) {
    return;
  }

  context.message.sendFiles(model.channelIdentifier, validFiles);
};

export interface ReplyMessageInfo {
  senderUserId: string;
  senderUserName: string;
  digest: string;
  isEdited: boolean;
}

export const createReplyMessageInfo = (): ReplyMessageInfo | undefined => {
  if (!replyMessage.value) {
    return undefined;
  }
  const msg = replyMessage.value;
  const { senderUserId, messageType, content } = msg;
  const senderUserName = ctx().appData.getUserProfile(senderUserId).name;
  let digest = getMessageDesc(msg);
  if (messageType === MessageType.FILE) {
    digest += ` ${(content as FileMessageContent).name}`;
  }
  return { senderUserId, senderUserName, digest, isEdited: msg.editTimestamp !== undefined };
}
