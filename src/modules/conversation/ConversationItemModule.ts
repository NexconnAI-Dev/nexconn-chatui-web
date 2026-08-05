import { ChatUIModule } from '../ChatUIModule';
import { ChatUIContext } from '../../core/ChatUIContext';

/**
 * Channel list item configuration
 * @description Customizes the appearance of channel list items
 * @example
 * ```typescript
 * const config: ChannelsItemConfig = {
 *   radius: 12,
 *   portraitSize: 'large',
 *   topBackgroundColor: 0xEFF4FF,
 *   hoverBackgroundColor: 0xF3F5FA,
 *   activeBackgroundColor: 0xD2E1FE
 * };
 * ```
 */
export interface ChannelsItemConfig {
  /**
   * Border radius for channel list items in pixels
   */
  radius?: number;
  /**
   * Avatar size: 'large' or 'small'
   */
  portraitSize?: 'large' | 'small';
  /**
   * Background color for pinned channels (hex number, e.g., 0xEFF4FF)
   */
  topBackgroundColor?: number;
  /**
   * Background color on hover (hex number)
   */
  hoverBackgroundColor?: number;
  /**
   * Background color when selected/active (hex number)
   */
  activeBackgroundColor?: number;
}

export const defaultChannelsItemConfig: ChannelsItemConfig = {
  radius: 20,
  portraitSize: 'large',
  topBackgroundColor: 0xEFF4FF,
  hoverBackgroundColor: 0xF3F5FA,
  activeBackgroundColor: 0xD2E1FE,
};

export class ChannelsItemModule extends ChatUIModule {
  public channelsItemConfig: ChannelsItemConfig = {};

  constructor(ctx: ChatUIContext) {
    super(ctx);
    this.setChannelsItemConfig(defaultChannelsItemConfig);
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
    this.setChannelsItemConfig(defaultChannelsItemConfig);
  }

  cloneChannelsItemConfig(): ChannelsItemConfig {
    return { ...this.channelsItemConfig };
  }

  setChannelsItemConfig(cfg: ChannelsItemConfig): void {
    this.channelsItemConfig = { ...this.channelsItemConfig, ...cfg };
  }
}
