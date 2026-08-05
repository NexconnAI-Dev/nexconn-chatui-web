import { LogTag } from "@lib/enums/LogTag";
import { BasicCache } from "./BasicCache";
import { ChatUIEvent } from "@lib/core/ChatUIEvent";
import { InnerEvent } from "@lib/core/EventDefined";
import { DEFAULT_SYSTEM_PORTRAIT_SVG } from "@lib/assets";

export interface ChatUISystemProfile {
  /**
   * System channel ID.
   */
  systemId: string;
  /**
   * System channel name.
   */
  name: string;
  /**
   * Channel avatar URL.
   */
  avatarUrl?: string;
}

export interface ICacheSystemProfile extends ChatUISystemProfile {
  /**
   * Marks default data that should be refreshed from the application when needed.
   */
  usingDefault: boolean;
  avatarUrl: string;
}

export class SystemCache extends BasicCache<ICacheSystemProfile, ChatUISystemProfile> {
  protected readonly ReqStartTag: string = LogTag.L_REQ_SYSTEM_PROFILE_HOOK_T;
  protected readonly ReqFailedTag: string = LogTag.L_REQ_SYSTEM_PROFILE_HOOK_E;
  protected readonly ReqSuccessTag: string = LogTag.L_REQ_SYSTEM_PROFILE_HOOK_R;

  protected readonly GetDefaultTag: string = LogTag.L_GET_DEFAULT_SYSTEM_PROFILE_HOOK_O;
  protected readonly GetDefaultErrorTag: string = LogTag.L_GET_DEFAULT_SYSTEM_PROFILE_HOOK_E;

  protected _checkAndUpdateCacheData(profile: ChatUISystemProfile): { cached: ICacheSystemProfile; changed: boolean; } {
    const { name, systemId, avatarUrl: portraitUri } = profile;

    let cacheProfile = this._cache.get(systemId);
    let changed = false;

    if (cacheProfile) {
      if (!this._isSameSystemProfile(cacheProfile, profile)) {
        // Update cached data.
        this._updateCacheSystemProfile(cacheProfile, profile);
        changed = true;
      }
    } else {
      changed = true;
      cacheProfile = {
        name,
        systemId,
        avatarUrl: portraitUri || DEFAULT_SYSTEM_PORTRAIT_SVG,
        usingDefault: false,
      };
      this._cache.set(systemId, cacheProfile);
    }

    return { changed, cached: cacheProfile };
  }

  private _isSameSystemProfile(
    a: ChatUISystemProfile,
    b: ChatUISystemProfile
  ): boolean {
    return a.systemId === b.systemId && a.name === b.name && a.avatarUrl === b.avatarUrl;
  }

  /** Update existing cached data and set usingDefault to false. */
  private _updateCacheSystemProfile(
    target: ICacheSystemProfile,
    source: ChatUISystemProfile
  ) {
    target.name = source.name;
    target.avatarUrl = source.avatarUrl || target.avatarUrl;
    target.usingDefault = false;
  }

  protected _isInvalid(profile: ChatUISystemProfile): boolean {
    return (
      typeof profile !== "object" ||
      !profile.systemId ||
      typeof profile.systemId !== "string" ||
      !profile.name ||
      typeof profile.name !== "string" ||
      (!!profile.avatarUrl && typeof profile.avatarUrl !== "string")
    );
  }

  protected _dispatchUpdateEvent(profiles: ICacheSystemProfile[]): void {
    if (profiles.length === 0) return;
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.SYSTEM_PROFILES_UPDATE, profiles));
  }

  protected _createDefaultCache(systemId: string, defaultProfile?: ChatUISystemProfile | undefined): ICacheSystemProfile {
    const result: ICacheSystemProfile = defaultProfile
      ? {
        ...defaultProfile,
        avatarUrl: defaultProfile.avatarUrl || DEFAULT_SYSTEM_PORTRAIT_SVG,
        usingDefault: true,
      }
      : {
        systemId,
        name: `${systemId}`,
        avatarUrl: DEFAULT_SYSTEM_PORTRAIT_SVG,
        usingDefault: true,
      };
    return result;
  }

}
