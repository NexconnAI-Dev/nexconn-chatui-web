import { LogTag } from "@lib/enums/LogTag";
import { BasicCache } from "./BasicCache";
import { ChatUIEvent } from "@lib/core/ChatUIEvent";
import { InnerEvent } from "@lib/core/EventDefined";
import { DEFAULT_GROUP_PORTRAIT_SVG } from "@lib/assets";
import { ChatUIContext } from "@lib/core/ChatUIContext";

/**
 * Group profile interface
 * @description Group information for display in the ChatUI
 * @example
 * ```typescript
 * const groupProfile: GroupProfile = {
 *   groupId: 'group456',
 *   name: 'Project Team',
 *   avatarUrl: 'https://example.com/group.png',
 *   memberCount: 10
 * };
 * ```
 */
export interface GroupProfile {
  /**
   * Group ID
   */
  groupId: string;
  /**
   * Group name
   */
  name: string;
  /**
   * Group avatar URL (optional)
   */
  avatarUrl?: string;
  /**
   * Number of members in the group
   */
  memberCount: number;
}

/**
 * Group member profile interface
 * @description Information about a member within a group
 * @example
 * ```typescript
 * const member: GroupMemberProfile = {
 *   userId: 'user123',
 *   nickname: 'Johnny'
 * };
 * ```
 */
export interface GroupMemberProfile {
  /**
   * User ID of the member
   */
  userId: string;
  /**
   * Nickname displayed in the group. If not provided, the user's name will be used.
   */
  nickname?: string;
}

/**
 * Cached group data.
 */
export interface ICacheGroupProfile extends GroupProfile {
  /**
   * Whether default data is in use, usually because the application data request failed.
   */
  usingDefault: boolean;
  avatarUrl: string;
}

export class GroupCache extends BasicCache<ICacheGroupProfile, GroupProfile> {
  protected readonly ReqStartTag: string = LogTag.L_REQ_GROUP_PROFILE_HOOK_T;
  protected readonly ReqFailedTag: string = LogTag.L_REQ_GROUP_PROFILE_HOOK_E;
  protected readonly ReqSuccessTag: string = LogTag.L_REQ_GROUP_PROFILE_HOOK_R;

  protected readonly GetDefaultTag: string = LogTag.L_GET_DEFAULT_GROUP_PROFILE_HOOK_O;
  protected readonly GetDefaultErrorTag: string = LogTag.L_GET_DEFAULT_GROUP_PROFILE_HOOK_E;

  /**
   * Cached group member data.
   * * key: groupId
   * * value: `GroupMemberProfile[]`
   */
  private _groupMembers: Map<string, GroupMemberProfile[]> = new Map();

  constructor(
    ctx: ChatUIContext,
    hook: (groupIds: string[]) => Promise<GroupProfile[]>,
    private _reqGroupMembers: (groupId: string) => Promise<GroupMemberProfile[]>,
    defaultHook?: (groupId: string) => GroupProfile,
  ) {
    super(ctx, hook, defaultHook);
  }

  protected _checkAndUpdateCacheData(profile: GroupProfile): { cached: ICacheGroupProfile; changed: boolean; } {
    const { name, groupId, avatarUrl: portraitUri } = profile;

    let cacheProfile = this._cache.get(groupId);
    let changed = false;

    if (cacheProfile) {
      if (!this._isSameGroupProfile(cacheProfile, profile)) {
        // Update cached data.
        this._updateCacheGroupProfile(cacheProfile, profile);
        changed = true;
      }
    } else {
      changed = true;
      cacheProfile = {
        name,
        groupId,
        avatarUrl: portraitUri || DEFAULT_GROUP_PORTRAIT_SVG,
        memberCount: 0,
        usingDefault: false,
      };
      this._cache.set(groupId, cacheProfile);
    }

    return { changed, cached: cacheProfile };
  }

  protected _isInvalid(profile: GroupProfile): boolean {
    return (
      typeof profile !== "object" ||
      !profile.groupId ||
      typeof profile.groupId !== "string" ||
      !profile.name ||
      typeof profile.name !== "string" ||
      (!!profile.avatarUrl && typeof profile.avatarUrl !== "string") ||
      typeof profile.memberCount !== "number" ||
      profile.memberCount < 0
    );
  }

  private _isSameGroupProfile(a: ICacheGroupProfile, b: GroupProfile): boolean {
    return (
      a.groupId === b.groupId &&
      a.name === b.name &&
      a.memberCount === b.memberCount &&
      a.avatarUrl === b.avatarUrl
    );
  }

  protected _dispatchUpdateEvent(profiles: ICacheGroupProfile[]): void {
    if (profiles.length === 0) {
      return;
    }
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.GROUP_PROFILES_UPDATE, profiles));
  }

  protected _createDefaultCache(groupId: string, defaultProfile?: GroupProfile | undefined): ICacheGroupProfile {
    const result: ICacheGroupProfile = defaultProfile
      ? {
        ...defaultProfile,
        avatarUrl: defaultProfile.avatarUrl || DEFAULT_GROUP_PORTRAIT_SVG,
        usingDefault: true,
      }
      : {
        groupId,
        name: `${groupId}`,
        avatarUrl: DEFAULT_GROUP_PORTRAIT_SVG,
        usingDefault: true,
        memberCount: 0,
      };
    return result;
  }

  /**
   * Update existing cached data and set usingDefault to false.
   */
  private _updateCacheGroupProfile(
    target: ICacheGroupProfile,
    source: GroupProfile
  ) {
    target.name = source.name;
    target.avatarUrl = source.avatarUrl || target.avatarUrl;
    target.memberCount = source.memberCount;
    target.usingDefault = false;
  }

  public updateGroupProfile(profile: GroupProfile): void {
    const traceId = this.logger.createTraceId();
    this.logger.warn(LogTag.A_UPDATE_GROUP_PROFILE_T, undefined, traceId);

    // Validate the data.
    if (this._isInvalid(profile)) {
      this.logger.error(
        LogTag.A_UPDATE_GROUP_PROFILE_E,
        "invalid group profile",
        traceId
      );
      return;
    }

    const { groupId, name, avatarUrl: portraitUri, memberCount } = profile;

    let cacheProfile = this._cache.get(groupId);
    if (cacheProfile && this._isSameGroupProfile(cacheProfile, profile)) {
      this.logger.warn(LogTag.A_UPDATE_GROUP_PROFILE_R, `group profile not changed: ${groupId}`, traceId);
      return;
    }

    if (!cacheProfile) {
      cacheProfile = {
        groupId,
        name,
        avatarUrl: portraitUri || DEFAULT_GROUP_PORTRAIT_SVG,
        usingDefault: false,
        memberCount,
      };
      this._cache.set(groupId, cacheProfile);
    } else {
      this._updateCacheGroupProfile(cacheProfile, profile);
    }

    this.logger.info(
      LogTag.A_UPDATE_GROUP_PROFILE_R,
      `groupId: ${groupId}, name: ${name}, portraitUri: ${portraitUri}, memberCount: ${memberCount}`,
      traceId
    );

    // Dispatch the event.
    this._dispatchUpdateEvent([cacheProfile]);
  }

  /**
   * Copy group member data to avoid sharing memory with the application layer.
   */
  private _cloneGroupMember(member: GroupMemberProfile): GroupMemberProfile {
    const { userId, nickname } = member;
    return { userId, nickname };
  }

  /**
   * Get the group member list.
   * @param groupId - Group ID.
   * @param ignoreCache - Whether to ignore the cache. Defaults to `true`.
   */
  async reqGroupMembers(groupId: string, ignoreCache: boolean = true): Promise<GroupMemberProfile[]> {
    const traceId = this.logger.createTraceId();

    if (!ignoreCache) {
      // Get group member data from the cache.
      const cacheMembers = this._groupMembers.get(groupId);
      if (cacheMembers) {
        return [...cacheMembers];
      }
    }

    let members: GroupMemberProfile[];

    // Request group member data from the application.
    try {
      this.logger.info(
        LogTag.L_REQ_GROUP_MEMBERS_HOOK_T,
        `groupId: ${groupId}`,
        traceId
      );
      members = await this._reqGroupMembers(groupId);
    } catch (error: any) {
      this.logger.error(
        LogTag.L_REQ_GROUP_MEMBERS_HOOK_E,
        error.message,
        traceId
      );
      return [];
    }

    // Validate members.
    if (!members || !Array.isArray(members)) {
      this.logger.error(
        LogTag.L_REQ_GROUP_MEMBERS_HOOK_E,
        "result must be a Array",
        traceId
      );
      return [];
    }

    const validMembers = members
      .filter((member, index) => {
        if (this._isInvalidGroupMemberProfile(member)) {
          this.logger.error(
            LogTag.L_REQ_GROUP_MEMBERS_HOOK_E,
            `result[${index}] is invalid`,
            traceId
          );
          return false;
        }
        return true;
      })
      .map(this._cloneGroupMember);

    this.logger.info(
      LogTag.L_REQ_GROUP_MEMBERS_HOOK_R,
      `groupId: ${groupId}, memberCount: ${members.length}`,
      traceId
    );

    // Update the cache.
    this._groupMembers.set(groupId, validMembers);
    return validMembers;
  }

  /**
   * Refresh group member data. If the member list differs from the cached `memberCount`,
   * the SDK updates `memberCount` and dispatches the relevant event.
   * @param groupId - Group ID.
   * @param members - New group member list.
   */
  updateGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    const traceId = this.logger.createTraceId();
    this.logger.info(
      LogTag.A_UPDATE_GROUP_MEMBERS_T,
      `groupId: ${groupId}`,
      traceId
    );

    // Validate members.
    if (!members || !Array.isArray(members)) {
      this.logger.error(
        LogTag.A_UPDATE_GROUP_MEMBERS_E,
        "param 'members' must be a Array",
        traceId
      );
      return;
    }

    // Do not update the cache if any member is invalid.
    if (
      members.some((member, index) => {
        if (this._isInvalidGroupMemberProfile(member)) {
          this.logger.error(
            LogTag.A_UPDATE_GROUP_MEMBERS_E,
            `param 'members[${index}]' is invalid`,
            traceId
          );
          return true;
        }
        return false;
      })
    ) {
      return;
    }

    // Update the cache.
    const cache = members.map(this._cloneGroupMember);
    this._groupMembers.set(groupId, cache);
    this._dispatchGroupMembersUpdateEvent(groupId, cache);

    // Update memberCount in the cached group data.
    const cacheProfile = this._cache.get(groupId);
    if (!cacheProfile) {
      this.logger.warn(
        LogTag.A_UPDATE_GROUP_MEMBERS_E,
        `group profile not found: ${groupId}`,
        traceId
      );
    } else if (cacheProfile.memberCount !== members.length) {
      // Update memberCount in the cached group data.
      cacheProfile.memberCount = members.length;
      // Dispatch a notification event.
      this._dispatchUpdateEvent([cacheProfile]);
    }

    this.logger.info(
      LogTag.A_UPDATE_GROUP_MEMBERS_R,
      `groupId: ${groupId}, memberCount: ${members.length}`,
      traceId
    );
  }

  /**
   * Add group members, possibly triggering a member count change event.
   * @param groupId
   * @param members
   */
  addGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    const traceId = this.logger.createTraceId();
    this.logger.info(
      LogTag.A_ADD_GROUP_MEMBERS_T,
      `groupId: ${groupId}`,
      traceId
    );

    // Validate members.
    if (!members || !Array.isArray(members)) {
      this.logger.error(
        LogTag.A_ADD_GROUP_MEMBERS_E,
        "param 'members' must be a Array",
        traceId
      );
      return;
    }

    // Do not update the cache if any member is invalid.
    const invalid = members.some((member, index) => {
      const bool = this._isInvalidGroupMemberProfile(member);
      if (bool) {
        this.logger.error(LogTag.A_ADD_GROUP_MEMBERS_E, `param 'members[${index}]' is invalid`, traceId);
      }
      return bool
    });
    if (invalid) {
      return;
    }

    // Update the member list and remove duplicates.
    const cacheMembers = this._groupMembers.get(groupId) || [];
    const newMembers = members.filter(
      (member) =>
        !cacheMembers.some(
          (cacheMember) => cacheMember.userId === member.userId
        )
    );

    // Do not update the cache when there are no new members.
    if (newMembers.length === 0) {
      this.logger.warn(
        LogTag.A_ADD_GROUP_MEMBERS_R,
        `no new members to add: ${groupId}`,
        traceId
      );
      return;
    }

    const updatedMembers = [
      ...cacheMembers,
      ...newMembers.map(this._cloneGroupMember),
    ];
    this._groupMembers.set(groupId, updatedMembers);
    this._dispatchGroupMembersUpdateEvent(groupId, updatedMembers);

    // Update cached group data.
    const cacheProfile = this._cache.get(groupId);
    if (cacheProfile) {
      // Recheck because group data and the member list may have different counts.
      if (cacheProfile.memberCount !== updatedMembers.length) {
        // Update memberCount in the cached group data.
        cacheProfile.memberCount = updatedMembers.length;
        // Dispatch a notification event.
        this._dispatchUpdateEvent([cacheProfile]);
      }
    } else {
      this.logger.warn(LogTag.A_ADD_GROUP_MEMBERS_E, `group profile not found: ${groupId}`, traceId);
    }

    this.logger.info(
      LogTag.A_ADD_GROUP_MEMBERS_R,
      `groupId: ${groupId}, members: ${members
        .map((member) => member.userId)
        .join(",")}`,
      traceId
    );
  }

  /**
   * Remove group members, possibly triggering a member count change event.
   * @param groupId - Group ID.
   * @param userIds - Member IDs to remove.
   */
  removeGroupMembers(groupId: string, userIds: string[]): void {
    const traceId = this.logger.createTraceId();
    this.logger.info(
      LogTag.A_REMOVE_GROUP_MEMBERS_T,
      `groupId: ${groupId}`,
      traceId
    );

    // Validate memberIds.
    if (!userIds || !Array.isArray(userIds)) {
      this.logger.error(
        LogTag.A_REMOVE_GROUP_MEMBERS_E,
        "param 'userIds' must be a Array",
        traceId
      );
      return;
    }

    // Remove invalid entries from memberIds.
    const validMemberIds = userIds.filter((userId, index) => {
      if (typeof userId !== "string" || userId.length === 0) {
        this.logger.error(
          LogTag.A_REMOVE_GROUP_MEMBERS_E,
          `param 'userIds[${index}]' is invalid`,
          traceId
        );
        return false;
      }
      return true;
    });

    if (validMemberIds.length === 0) {
      this.logger.warn(
        LogTag.A_REMOVE_GROUP_MEMBERS_R,
        `no valid members to remove: ${groupId}`,
        traceId
      );
      return;
    }

    const cacheMembers = this._groupMembers.get(groupId);
    if (!cacheMembers) {
      this.logger.warn(
        LogTag.A_REMOVE_GROUP_MEMBERS_E,
        `group members not found: ${groupId}`,
        traceId
      );
      return;
    }

    // Remove members.
    const updatedMembers = cacheMembers.filter(
      (member) => !validMemberIds.includes(member.userId)
    );
    this._groupMembers.set(groupId, updatedMembers);
    this._dispatchGroupMembersUpdateEvent(groupId, updatedMembers);

    // Update cached group data.
    const cacheProfile = this._cache.get(groupId);
    if (cacheProfile) {
      // Recheck because group data and the member list may have different counts.
      if (cacheProfile.memberCount !== updatedMembers.length) {
        // Update memberCount in the cached group data.
        cacheProfile.memberCount = updatedMembers.length;
        // Dispatch a notification event.
        this._dispatchUpdateEvent([cacheProfile]);
      }
    } else {
      this.logger.warn(
        LogTag.A_REMOVE_GROUP_MEMBERS_E,
        `group profile not found: ${groupId}`,
        traceId
      );
    }

    this.logger.info(
      LogTag.A_REMOVE_GROUP_MEMBERS_R,
      `groupId: ${groupId}, members: ${validMemberIds.join(",")}`,
      traceId
    );
  }

  private _isInvalidGroupMemberProfile(
    profile: GroupMemberProfile
  ): boolean {
    return (
      typeof profile !== "object" ||
      !profile.userId ||
      typeof profile.userId !== "string" ||
      (!!profile.nickname && typeof profile.nickname !== "string")
    );
  }

  private _dispatchGroupMembersUpdateEvent(
    groupId: string,
    members: GroupMemberProfile[]
  ) {
    this._ctx.dispatchEvent(new ChatUIEvent(InnerEvent.GROUP_MEMBERS_UPDATE, { groupId, members }));
  }

  public clear(): void {
    super.clear();
    this._groupMembers.clear();
  }
}
