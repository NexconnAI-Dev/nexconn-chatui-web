import { ILogger } from '@nexconn/engine';
import { ChatUIContext } from '../core/ChatUIContext';
import { ChatUIStore } from './ChatUIStore';
import { InnerEvent } from '@lib/core/EventDefined';

export abstract class ChatUIModule {
  protected readonly logger: ILogger;

  protected readonly store: ChatUIStore;

  constructor(protected ctx: ChatUIContext) {
    this.logger = ctx.logger;
    this.store = ctx.store;

    this.ctx.addEventListener(InnerEvent.DESTROY_USER_CACHE, this._onDestroyUserCache, this);
    this.ctx.addEventListener(InnerEvent.INIT_USER_CACHE, this._onInitUserCache, this);
    this._onInit();
  }

  /**
   * Initialize the module.
   */
  protected _onInit(): void {
    // No action required yet.
  }

  /**
   * Initialize user-scoped cached data.
   */
  protected abstract _onInitUserCache(): void;

  /**
   * Destroy user-scoped cached data.
   */
  protected abstract _onDestroyUserCache(): void;

  /**
   * Deinitialize the module.
   */
  public abstract destroy(): void;
}
