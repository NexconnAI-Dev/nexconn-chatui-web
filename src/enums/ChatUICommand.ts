/**
 * Feature toggle commands for controlling ChatUI behavior
 * @description Use these commands with setCommandSwitch() to enable/disable specific features
 * @example
 * ```typescript
 * // Enable message read status display
 * app.setCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE, true);
 *
 * // Enable @all functionality
 * app.setCommandSwitch(ChatUICommand.AT_ALL, true);
 * ```
 */
export enum ChatUICommand {
  /**
   * Show connection status in the channel list
   * - true - Show (Default)
   * - false - Hide
   */
  SHOW_CONNECTION_STATUS_IN_CHANNEL_LIST = 'SHOW_CONNECTION_STATUS_IN_CHANNEL_LIST',
  /**
   * Show message read and sent status
   * - true - Enable (Default)
   * - false - Disable, only show sending and failed status
   */
  SHOW_MESSAGE_STATE = 'SHOW_MESSAGE_STATE',
  /**
   * '@all' functionality toggle
   * - true - Enable (Default)
   * - false - Disable
   */
  MENTION_ALL = 'MENTION_ALL',
  /**
   * Automatically @ the sender when quoting or replying to a message
   * - true - Enable
   * - false - Disable (Default)
   */
  PROMPT_SENDER_WHEN_QUOTE_MESSAGE = 'PROMPT_SENDER_WHEN_QUOTE_MESSAGE',
  /**
   * Delete local and remote messages when deleting a channel
   * - true - Enable
   * - false - Disable (Default)
   */
  DELETE_MESSAGES_WHILE_DELETE_CHANNEL = 'DELETE_MESSAGES_WHILE_DELETE_CHANNEL',
}
