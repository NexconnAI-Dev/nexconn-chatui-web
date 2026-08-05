import { LogTag } from "@lib/enums/LogTag";
import { BasicCache } from "./BasicCache";
import { DEFAULT_USER_PORTRAIT_SVG } from "@lib/assets";
import { ChatUIEvent } from "@lib/core/ChatUIEvent";
import { InnerEvent } from "@lib/core/EventDefined";
import { ChatUICommand } from "@lib/enums/ChatUICommand";
import { ChatUIContext } from "@lib/core/ChatUIContext";

/**
 * User profile interface
 * @description Basic user information for display in the ChatUI
 * @example
 * ```typescript
 * const userProfile: ChatUIUserProfile = {
 *   userId: 'user123',
 *   name: 'John Doe',
 *   avatarUrl: 'https://example.com/avatar.png'
 * };
 * ```
 */
export interface ChatUIUserProfile {
  /**
   * User ID
   */
  userId: string;
  /**
   * User display name
   */
  name: string;
  /**
   * Avatar URL (optional)
   */
  avatarUrl?: string;
}

/**
 * Cached user data.
 */
export interface ICacheUserProfile extends ChatUIUserProfile {
  /**
   * Marks default user data that should be refreshed from the application when needed.
   */
  usingDefault: boolean;
  /**
   * Avatar URL.
   */
  avatarUrl: string;
  /**
   * Online status.
   */
  online: boolean;
}

/**
 * User data cache.
 */
export class UserCache extends BasicCache<ICacheUserProfile, ChatUIUserProfile> {
  protected readonly GetDefaultTag: string = LogTag.L_GET_DEFAULT_USER_PROFILE_HOOK_O;

  protected readonly GetDefaultErrorTag: string = LogTag.L_GET_DEFAULT_USER_PROFILE_HOOK_E;

  protected readonly ReqStartTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_T;

  protected readonly ReqFailedTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_E;

  protected readonly ReqSuccessTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_R;

  constructor(
    ctx: ChatUIContext,
    hook: (ids: string[]) => Promise<ChatUIUserProfile[]>,
    defaultHook?: (id: string) => ChatUIUserProfile,
  ) {
    super(ctx, hook, defaultHook);
  }

  private _isSameUserProfile(a: ChatUIUserProfile, b: ChatUIUserProfile): boolean {
    return a.name === b.name && a.userId === b.userId && a.avatarUrl === b.avatarUrl;
  }

  private _updateCacheUserProfile(cache: ICacheUserProfile, profile: ChatUIUserProfile): void {
    cache.name = profile.name;
    cache.avatarUrl = profile.avatarUrl || cache.avatarUrl;
    cache.usingDefault = false;
  }

  protected _checkAndUpdateCacheData(profile: ChatUIUserProfile): { cached: ICacheUserProfile; changed: boolean; } {
    const { name, userId, avatarUrl: portraitUri } = profile;

    let cacheProfile = this._cache.get(userId);
    let changed = false;

    if (cacheProfile) {
      if (!this._isSameUserProfile(cacheProfile, profile)) {
        // Update cached data.
        this._updateCacheUserProfile(cacheProfile, profile);
        changed = true;
      }
    } else {
      changed = true;
      cacheProfile = {
        name,
        userId,
        avatarUrl: portraitUri || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: false,
        online: false,
      };
      this._cache.set(userId, cacheProfile);
    }

    return { changed, cached: cacheProfile };
  }

  protected _isInvalid(profile: ChatUIUserProfile): boolean {
    return (
      typeof profile !== "object" ||
      !profile.userId ||
      typeof profile.userId !== "string" ||
      !profile.name ||
      typeof profile.name !== "string" ||
      (!!profile.avatarUrl && typeof profile.avatarUrl !== "string")
    );
  }

  protected _dispatchUpdateEvent(datas: ICacheUserProfile[]): void {
    if (datas.length === 0) {
      return;
    }

    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.USER_PROFILES_UPDATE, datas));
  }

  protected _createDefaultCache(userId: string, defaultProfile: ChatUIUserProfile): ICacheUserProfile {
    const result: ICacheUserProfile = defaultProfile
      ? {
        ...defaultProfile,
        avatarUrl: defaultProfile.avatarUrl || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: true,
        online: false,
      }
      : {
        userId,
        name: `${userId}`,
        avatarUrl: DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: true,
        online: false,
      };
    return result
  }

  /**
   * @param profiles
   */
  public updateUserProfile(profile: ChatUIUserProfile): void {
    const traceId = this.logger.createTraceId();
    this.logger.warn(LogTag.A_UPDATE_USER_PROFILE_T, undefined, traceId);

    // Validate the data.
    if (this._isInvalid(profile)) {
      this.logger.error(
        LogTag.A_UPDATE_USER_PROFILE_E,
        "invalid user profile",
        traceId
      );
      return;
    }

    const { userId, name, avatarUrl: portraitUri } = profile;

    let cacheProfile = this._cache.get(userId);
    if (cacheProfile && this._isSameUserProfile(cacheProfile, profile)) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_PROFILE_R,
        `user profile not changed: ${userId}`,
        traceId
      );
      return;
    }

    if (!cacheProfile) {
      cacheProfile = {
        userId,
        name,
        avatarUrl: portraitUri || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: false,
        online: false,
      };
      this._cache.set(userId, cacheProfile);
    } else {
      this._updateCacheUserProfile(cacheProfile, profile);
    }

    this.logger.info(
      LogTag.A_UPDATE_USER_PROFILE_R,
      `userId: ${userId}, name: ${name}, portraitUri: ${portraitUri}`,
      traceId
    );

    // Dispatch the event.
    this._dispatchUpdateEvent([cacheProfile]);
  }

  updateUserOnlineStatus(userId: string, online: boolean): void {
    const traceId = this.logger.createTraceId();
    this.logger.info(
      LogTag.A_UPDATE_USER_ONLINE_STATE_T,
      `userId: ${userId}, online: ${online}`,
      traceId
    );
    const profile = this._cache.get(userId);
    if (!profile) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_ONLINE_STATE_R,
        `user profile not found: ${userId}`,
        traceId
      );
      return;
    }

    if (profile.online === online) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_ONLINE_STATE_R,
        `user online state not changed: ${userId}`,
        traceId
      );
      return;
    }

    profile.online = online;
    this.logger.info(
      LogTag.A_UPDATE_USER_ONLINE_STATE_R,
      `userId: ${userId}, online: ${online}`,
      traceId
    );

    // Dispatch the event.
    this._dispatchUpdateEvent([profile]);
  }
}
