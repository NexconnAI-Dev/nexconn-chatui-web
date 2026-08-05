import { ChatUIModule } from './ChatUIModule';

/**
 * Emoji settings are configured before initialization and do not depend on the user lifecycle.
 */
export class EmojiModule extends ChatUIModule {
  protected _onInitUserCache(): void {
    // No implementation required.
  }

  protected _onDestroyUserCache(): void {
    // No implementation required for emoji configuration.
  }

  public destroy(): void {
    // No implementation required.
  }
}
