/**
 * Internal only. Public APIs expose these values as numbers.
 */
export const NCChatUICode = {
  SUCCESS: 0,
  /** Not ready */
  CHATUI_NOT_READY: 39001,
  /** Already ready */
  MUST_CALL_BEFORE_READY: 39002,
  /** Invalid channel */
  INVALID_CHANNEL: 39003,
  /** Task canceled */
  TASK_CANCEL: 39004,
  /** Channel list synchronization is not complete */
  CHANNEL_LIST_NOT_READY: 39005,
  /** Invalid message */
  INVALID_MESSAGE: 39006,
  /** Failed to get the channel */
  GET_CHANNEL_FAILED: 35021, // Matches @nexconn/engine ErrorCode.CONVER_GET_ERROR.
  /** Message content does not support speech-to-text */
  SPEECH_TO_TEXT_MESSAGE_CONTENT_UNSUPPORTED: 35059, // Matches @nexconn/engine ErrorCode.SPEECH_TO_TEXT_MESSAGE_CONTENT_UNSUPPORTED.
};
