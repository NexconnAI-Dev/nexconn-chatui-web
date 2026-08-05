import {
  MSG_MENU_COPY_ICON, MSG_MENU_DEELTE_ICON,
  MSG_MENU_REPLY_ICON, MSG_MENU_SELECT_ICON, MSG_MENU_FORWARD_ICON,
  MSG_MENU_STT_ICON,
  MSG_MENU_CANCEL_STT_ICON,
} from '../assets';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ChatUIModule } from './ChatUIModule';
import { MessageType, ChannelType } from '@nexconn/chat';
import { SpeechToTextStore } from './SpeechToTextStore';
import { NCEngine } from '@nexconn/chat';
import { MessageDirection } from '@nexconn/chat';
import { SentStatus } from '@nexconn/chat';

/**
 * Message context menu item IDs
 * @description Built-in menu item identifiers for message operations
 */
export enum MessageMenuID {
  /** Reply/Quote message */
  REPLY = 'message.menu.item.reply',
  /** Multi-select mode */
  MULIT_CHOICE = 'message.menu.item.multi.choice',
  /** Copy message text */
  COPY = 'message.menu.item.copy',
  /** Forward message */
  FORWARD = 'message.menu.item.forward',
  /** Convert voice to text */
  SPEECH_TO_TEXT = 'message.menu.item.speech.to.text',
  /** Cancel voice-to-text conversion */
  CANCEL_SPEECH_TO_TEXT = 'message.menu.item.cancel.speech.to.text',
  /** Delete message for me */
  DELETE_FOR_ME = 'message.menu.item.delete.for.me',
  /** Delete message for all */
  DELETE_FOR_ALL = 'message.menu.item.delete.for.all',
}

/**
 * Message context menu item configuration
 * @description Defines a menu item shown when right-clicking or long-pressing a message
 * @example
 * ```typescript
 * const menuItem: MessageMenuItem = {
 *   id: MessageMenuID.COPY,
 *   icon: 'copy-icon.svg',
 *   filter: (message) => message.messageType === MessageType.TEXT
 * };
 * ```
 */
export interface MessageMenuItem {
  /**
   * Menu item ID. Used in click events and for i18n text lookup.
   */
  id: MessageMenuID | string,
  /**
   * Menu item icon URL
   */
  icon: string,
  /**
   * Filter function to control when this menu item is visible
   * @param message - Message model
   * @returns true to show the menu item, false to hide it
   */
  readonly filter?: (message: ChatUIMessageModel) => boolean,
}

const cloneMsgMenu = (menu: MessageMenuItem[]): MessageMenuItem[] => menu.map((item) => ({ ...item }));

export class MessageMenu extends ChatUIModule {
  private _menu: MessageMenuItem[] = this._createDefaultMenu();
  private _speechToTextStore?: SpeechToTextStore;

  protected _onInit(): void {
    // No implementation required.
  }

  protected _onInitUserCache(): void {
    // No implementation required.
  }

  protected _onDestroyUserCache(): void {
    // No implementation required.
  }

  public destroy(): void {
    this._menu = this._createDefaultMenu();
  }

  public setSpeechToTextStore(store: SpeechToTextStore) {
    this._speechToTextStore = store;
  }

  getMenu(message: ChatUIMessageModel): MessageMenuItem[] {
    return this._menu.filter((item) => !item.filter || item.filter(message));
  }

  public cloneMessageMenu(): MessageMenuItem[] {
    return cloneMsgMenu(this._menu);
  }

  public setMessageMenu(menu: MessageMenuItem[]) {
    this._menu = cloneMsgMenu(menu);
  }

  private _createDefaultMenu(): MessageMenuItem[] {
    const ctx = this.ctx;

    /** Check whether the message was sent successfully. */
    const isSentMessage = (message: ChatUIMessageModel) => {
      const { sentStatus } = message;
      return sentStatus !== SentStatus.SENDING && sentStatus !== SentStatus.FAILED;
    }

    /** Recall: delete for all. */
    const deleteMessaageForAll: MessageMenuItem = {
      id: MessageMenuID.DELETE_FOR_ALL,
      icon: MSG_MENU_DEELTE_ICON,
      filter(message) {
        // Show only for successfully sent outgoing messages within the recall window.
        // DELETE_FOR_ALL and DELETE_FOR_ME are mutually exclusive.
        const { direction, sentStatus, sentTime } = message;
        if (direction !== MessageDirection.SEND) {
          // Hide for incoming messages.
          return false;
        }
        if (!isSentMessage(message)) {
          // Hide for sending or failed messages.
          return false;
        }
        return Date.now() - sentTime < ctx.allowedToRecallTime * 1000;
      }
    };
    /** Delete for me. */
    const deleteMessaageForMe: MessageMenuItem = {
      id: MessageMenuID.DELETE_FOR_ME,
      icon: MSG_MENU_DEELTE_ICON,
      filter(message) {
        const { direction, sentStatus, sentTime } = message;
        if (direction === MessageDirection.RECEIVE) {
          // Show for incoming messages.
          return true;
        }
        if (sentStatus === SentStatus.SENDING) {
          // Hide for sending messages.
          return false;
        }
        if (sentStatus === SentStatus.FAILED) {
          // Show for failed messages.
          return true;
        }
        // Hide successfully sent messages while they remain recallable.
        return !(Date.now() - sentTime < ctx.allowedToRecallTime * 1000);
      }
    };
    /** Quote/reply. */
    const replyMessage: MessageMenuItem = {
      id: MessageMenuID.REPLY,
      icon: MSG_MENU_REPLY_ICON,
      filter(message) {
        const { channelType, messageType, sentStatus } = message;
        if (channelType === ChannelType.SYSTEM) {
          // System channels do not support quote/reply.
          return false;
        }
        if (sentStatus === SentStatus.SENDING || sentStatus === SentStatus.FAILED) {
          // Sending or failed messages do not support quote/reply.
          return false;
        }
        // Quote/reply is limited to text, file, image, and reference messages.
        const enableTypes: string[] = [
          MessageType.TEXT,
          MessageType.FILE,
          MessageType.IMAGE,
          MessageType.REFERENCE,
        ];
        return enableTypes.includes(messageType);
      }
    }
    /** Copy. */
    const copyMessage: MessageMenuItem = {
      id: MessageMenuID.COPY,
      icon: MSG_MENU_COPY_ICON,
      filter(message) {
        const { messageType } = message;
        return navigator.clipboard && (messageType === MessageType.TEXT || messageType === MessageType.REFERENCE);
      }
    }
    /** Forward. */
    const forwardMessage: MessageMenuItem = {
      id: MessageMenuID.FORWARD,
      icon: MSG_MENU_FORWARD_ICON,
      filter(message) {
        const { channelType, messageType, sentStatus } = message;
        if (channelType === ChannelType.SYSTEM) {
          // System channels do not support forwarding.
          return false;
        }
        if (sentStatus === SentStatus.SENDING || sentStatus === SentStatus.FAILED) {
          // Sending or failed messages do not support forwarding.
          return false;
        }
        const types: string[] = [
          MessageType.TEXT,
          MessageType.IMAGE,
          MessageType.FILE,
          MessageType.HD_VOICE,
          MessageType.COMBINE,
          MessageType.GIF,
          MessageType.SHORT_VIDEO,
          MessageType.FILE,
          MessageType.REFERENCE,
        ];
        return types.includes(messageType);
      }
    }
    /** Multi-select. */
    const multiChoiceMessage: MessageMenuItem = {
      id: MessageMenuID.MULIT_CHOICE,
      icon: MSG_MENU_SELECT_ICON,
      filter(message) {
        const { channelType } = message;
        return channelType !== ChannelType.SYSTEM;
      }
    }

    const speechToTextFilter = (message: ChatUIMessageModel) => {
      // Check the feature flag.
      if (!(NCEngine.getAppSettings().data?.isSpeechToTextEnabled)) {
        return false;
      }
      const { sentStatus, messageType } = message;
      if (sentStatus === SentStatus.SENDING || sentStatus === SentStatus.FAILED) {
        // Sending or failed messages do not support speech-to-text.
        return false;
      }
      if (messageType !== MessageType.HD_VOICE) {
        // Non-voice messages do not support speech-to-text.
        return false;
      }
      return true;
    }
    /** Speech-to-text. */
    const speechToTextMessage: MessageMenuItem = {
      id: MessageMenuID.SPEECH_TO_TEXT,
      icon: MSG_MENU_STT_ICON,
      filter: (message) => speechToTextFilter(message) && (!this._speechToTextStore?.hasConverted(message.messageId)),
    }
    /** Cancel speech-to-text. */
    const cancelSpeechToTextMessage: MessageMenuItem = {
      id: MessageMenuID.CANCEL_SPEECH_TO_TEXT,
      icon: MSG_MENU_CANCEL_STT_ICON,
      filter: (message) => speechToTextFilter(message) && (!!this._speechToTextStore?.hasConverted(message.messageId)),
    }
    return [
      deleteMessaageForAll,
      deleteMessaageForMe,
      replyMessage,
      copyMessage,
      forwardMessage,
      multiChoiceMessage,
      speechToTextMessage,
      cancelSpeechToTextMessage,
    ];
  }
}
