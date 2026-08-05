/** Aggregated mention type for group channels. */
export enum ChatUIMentionedType {
  /**
   * No mentions
   */
  NONE = 0,
  /**
   * Someone mentioned everyone in the group
   */
  AT_ALL = 1,
  /**
   * Someone mentioned the current user in the group
   */
  AT_ME = 2,
}
