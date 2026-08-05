import { ChatUIModule } from './ChatUIModule';
import { ChatUIContext } from '../core/ChatUIContext';

/**
 * Message bubble layout alignment
 * @description Controls how message bubbles are positioned in the chat panel
 */
export enum BubbleLayout {
  /**
   * All message bubbles aligned to the left
   */
  LEFT_JUSTIFYING = 'left-justifying',
  /**
   * Messages distributed left and right: own messages on the right, others' messages on the left
   */
  LEFT_RIGHT = 'left-right'
}

/**
 * Message bubble configuration
 * @description Customizes the appearance and display of message bubbles
 */
export interface MessageBubbleConfig {
  /** Border radius in pixels */
  redius?: number
  /** Message alignment: left-justifying or left-right distribution */
  layout?: BubbleLayout
  /** Background color for own messages (hex number, e.g., 0x007AFF) */
  backgroundColorForMyself?: number
  /** Background color for others' messages (hex number) */
  backgroundColorForOthers?: number
  /** Text color for own messages (hex number) */
  textColorForMyself?: number
  /** Text color for others' messages (hex number) */
  textColorForOthers?: number
  /**
   * Show own avatar in private chats (default: false)
   */
  showMyProfileInDirectionChannel?: boolean
  /**
   * Show own name in private chats (default: false)
   */
  showMyNameInDirectionChannel?: boolean
  /**
   * Show own avatar in group chats (default: false)
   */
  showMyProfileInGroupChannel?: boolean
  /**
   * Show own name in group chats (default: false)
   */
  showMyNameInGroupChannel?: boolean
  /**
   * Show others' avatars in private chats (default: false)
   */
  showOthersProfileInDirectionChannel?: boolean
  /**
   * Show others' names in private chats (default: false)
   */
  showOthersNameInDirectionChannel?: boolean
  /**
   * Show others' avatars in group chats (default: true)
   */
  showOthersProfileInGroupChannel?: boolean
  /**
   * Show others' names in group chats (default: false)
   */
  showOthersNameInGroupChannel?: boolean
}

/**
 * Default bubble configuration.
 */
const defaultBubbleCfg: MessageBubbleConfig = {
  redius: 20,
  layout: BubbleLayout.LEFT_RIGHT,
  backgroundColorForMyself: 0xD2E1FE,
  backgroundColorForOthers: 0xF3F5FA,
  textColorForMyself: 0x020814,
  textColorForOthers: 0x020814,
  showMyProfileInDirectionChannel: true,
  showMyNameInDirectionChannel: false,
  showMyProfileInGroupChannel: true,
  showMyNameInGroupChannel: false,
  showOthersProfileInDirectionChannel: true,
  showOthersNameInDirectionChannel: false,
  showOthersProfileInGroupChannel: true,
  showOthersNameInGroupChannel: true,

};
const cloneMessageBubbleCfg = (config: MessageBubbleConfig) => ({ ...config });

export class BubbleModule extends ChatUIModule {
  public messageBubbleCfg: MessageBubbleConfig = {};

  constructor(ctx: ChatUIContext) {
    super(ctx);

    this.setMessageBubbleConfig(defaultBubbleCfg);
  }

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
    this.setMessageBubbleConfig(defaultBubbleCfg);
  }

  cloneMessageBubbleConfig(): MessageBubbleConfig {
    return cloneMessageBubbleCfg(this.messageBubbleCfg);
  }

  setMessageBubbleConfig(bubbleCfg: MessageBubbleConfig): void {
    this.messageBubbleCfg = { ...this.messageBubbleCfg, ...bubbleCfg };
  }
}
