import { ChatUIContext } from "../../core/ChatUIContext";
import { ChatUIModule } from "../ChatUIModule";
import { ChatUIUserProfile, ICacheUserProfile, UserCache } from './UserCache';
import { GroupProfile, ICacheGroupProfile, GroupCache, GroupMemberProfile } from './GroupCache';
import { ICacheSystemProfile, ChatUISystemProfile, SystemCache } from "./SystemCache";

/**
 * Service hooks interface for injecting business data into ChatUI
 * @description Provides callback functions to fetch user profiles, group profiles, system profiles, and group members from your backend
 */
export interface ServiceHooks {
  /**
   * Fetch user profiles by user IDs in batch
   * @param userIds - Array of user IDs
   * @returns Promise resolving to array of user profiles
   * @example
   * ```typescript
   * reqUserProfiles: async (userIds) => {
   *   const users = await fetchUsersFromBackend(userIds);
   *   return users.map(user => ({
   *     userId: user.id,
   *     name: user.displayName,
   *     avatarUrl: user.avatarUrl
   *   }));
   * }
   * ```
   */
  reqUserProfiles(userIds: string[]): Promise<ChatUIUserProfile[]>;

  /**
   * Fetch group profiles by group IDs in batch
   * @param groupIds - Array of group IDs
   * @returns Promise resolving to array of group profiles
   * @example
   * ```typescript
   * reqGroupProfiles: async (groupIds) => {
   *   const groups = await fetchGroupsFromBackend(groupIds);
   *   return groups.map(group => ({
   *     groupId: group.id,
   *     name: group.name,
   *     avatarUrl: group.avatarUrl,
   *     memberCount: group.memberCount
   *   }));
   * }
   * ```
   */
  reqGroupProfiles(groupIds: string[]): Promise<GroupProfile[]>;

  /**
   * Fetch system channel profiles in batch
   * @description Called when channel list contains ChannelType.SYSTEM type channels
   * @param targetIds - Array of system channel IDs
   * @returns Promise resolving to array of system profiles
   * @example
   * ```typescript
   * reqSystemProfiles: async (targetIds) => {
   *   const systems = await fetchSystemChannelsFromBackend(targetIds);
   *   return systems.map(sys => ({
   *     systemId: sys.id,
   *     name: sys.name,
   *     avatarUrl: sys.iconUrl
   *   }));
   * }
   * ```
   */
  reqSystemProfiles(targetIds: string[]): Promise<ChatUISystemProfile[]>;

  /**
   * Fetch group member information
   * @param groupId - Group ID
   * @returns Promise resolving to array of group members
   * @example
   * ```typescript
   * reqGroupMembers: async (groupId) => {
   *   const members = await fetchGroupMembersFromBackend(groupId);
   *   return members.map(member => ({
   *     userId: member.userId,
   *     nickname: member.nickname
   *   }));
   * }
   * ```
   */
  reqGroupMembers(groupId: string): Promise<GroupMemberProfile[]>;

  /**
   * [Optional] Define default user profile to replace SDK's default initial data
   * @description Used when user profile is not yet loaded, provides placeholder data like avatar and name
   * @param userId - User ID
   * @returns Default user profile
   * @example
   * ```typescript
   * getDefaultUserProfile: (userId) => ({
   *   userId,
   *   name: `User ${userId.substring(0, 8)}`,
   *   avatarUrl: 'https://example.com/default-avatar.png'
   * })
   * ```
   */
  getDefaultUserProfile?(userId: string): ChatUIUserProfile;

  /**
   * [Optional] Define default group profile to replace SDK's default data
   * @description Used when group profile is not yet loaded, provides placeholder data like avatar and name
   * @param groupId - Group ID
   * @returns Default group profile
   * @example
   * ```typescript
   * getDefaultGroupProfile: (groupId) => ({
   *   groupId,
   *   name: `Group ${groupId.substring(0, 8)}`,
   *   avatarUrl: 'https://example.com/default-group.png',
   *   memberCount: 0
   * })
   * ```
   */
  getDefaultGroupProfile?(groupId: string): GroupProfile;

  /**
   * [Optional] Define default system channel profile to replace SDK's default data
   * @description Used when system profile is not yet loaded, provides placeholder data like icon and name
   * @param systemId - System channel ID
   * @returns Default system profile
   * @example
   * ```typescript
   * getDefaultSystemProfile: (systemId) => ({
   *   systemId,
   *   name: `System ${systemId}`,
   *   avatarUrl: 'https://example.com/default-system.png'
   * })
   * ```
   */
  getDefaultSystemProfile?(systemId: string): ChatUISystemProfile;
}

/**
 * Application data module.
 */
export class AppDataModule extends ChatUIModule {
  /**
   * User data cache.
   */
  private _users: UserCache;

  /**
   * Group data cache.
   */
  private _groups: GroupCache;

  /**
   * System channel data cache.
   */
  private _systems: SystemCache;

  constructor(ctx: ChatUIContext, private _hooks: ServiceHooks) {
    super(ctx);

    this._users = new UserCache(ctx, this._hooks.reqUserProfiles, this._hooks.getDefaultUserProfile);
    this._groups = new GroupCache(ctx, this._hooks.reqGroupProfiles, this._hooks.reqGroupMembers, this._hooks.getDefaultGroupProfile);
    this._systems = new SystemCache(ctx, this._hooks.reqSystemProfiles, this._hooks.getDefaultSystemProfile);
  }

  protected _onInit(): void {
    // No implementation required.
  }

  protected _onInitUserCache(): void {
    // Application data is not user-scoped, so the cache remains valid across signed-in users.
  }

  protected _onDestroyUserCache(): void {
    // Application data is not user-scoped, so the cache remains valid across signed-in users.
  }

  public destroy(): void {
    this._systems.clear();
    this._users.clear();
    this._groups.clear();
  }

  /**
   * Request user data and dispatch an update event when records are added or changed.
   * @param userIds - User ID list.
   * @param ignoreCache - Whether to ignore cached data.
   */
  async requestUserProfiles(userIds: string[], ignoreCache: boolean = false): Promise<ICacheUserProfile[]> {
    return this._users.getCache(userIds, ignoreCache);
  }

  /**
   * Request system channel data and dispatch an update event when records are added or changed.
   * @param systemIds - System channel ID list.
   * @param ignoreCache - Whether to ignore cached data.
   */
  async requestSystemProfiles(systemIds: string[], ignoreCache: boolean = false): Promise<ICacheSystemProfile[]> {
    return this._systems.reqData(systemIds, ignoreCache);
  }

  /**
   * Request group data and dispatch an update event when records are added or changed.
   * @param groupIds - Group ID list.
   * @param ignoreCache - Whether to ignore cached data.
   */
  async requestGroupProfiles(groupIds: string[], ignoreCache: boolean = false): Promise<ICacheGroupProfile[]> {
    return this._groups.reqData(groupIds, ignoreCache);
  }

  /**
   * Get user data.
   * @param userId
   */
  getUserProfile(userId: string): ICacheUserProfile {
    return this.getUserProfiles([userId])[0];
  }

  getGroupProfile(groupId: string): ICacheGroupProfile {
    return this.getGroupProfiles([groupId])[0];
  }

  /**
   * Get user data synchronously. Missing records return defaults and trigger asynchronous application requests.
   * The cache is updated and a notification is dispatched when each request completes.
   * @param userIds - User ID list.
   * @param cancelReq - When true, do not request data from the application.
   */
  getUserProfiles(userIds: string[], cancelReq: boolean = false): ICacheUserProfile[] {
    return this._users.getCache(userIds, cancelReq);
  }

  /**
   * Get system channel data synchronously. Missing records return defaults and trigger asynchronous application requests.
   * The cache is updated and a notification is dispatched when each request completes.
   * @param systemIds - System channel ID list.
   * @param cancelReq - Whether to suppress the request when data is missing.
   */
  getSystemProfiles(systemIds: string[], cancelReq: boolean = false): ICacheSystemProfile[] {
    return this._systems.getCache(systemIds, cancelReq)
  }

  /**
   * Get group data synchronously. Missing records return defaults and trigger asynchronous application requests.
   * The cache is updated and a notification is dispatched when each request completes.
   * @param groupIds - Group ID list.
   * @param cancelReq - Whether to suppress the request when data is missing.
   */
  getGroupProfiles(groupIds: string[], cancelReq: boolean = false): ICacheGroupProfile[] {
    return this._groups.getCache(groupIds, cancelReq);
  }

  /**
   * Force a user data refresh and dispatch an update notification when data changes.
   * Application-layer use only.
   * @param profile
   */
  updateUserProfile(profile: ChatUIUserProfile): void {
    this._users.updateUserProfile(profile);
  }

  /**
   * Update group data.
   * @param profile
   */
  updateGroupProfile(profile: GroupProfile): void {
    this._groups.updateGroupProfile(profile);
  }

  /**
   * Update user online status.
   * @param userId User ID.
   * @param online Online status.
   */
  updateUserOnlineStatus(userId: string, online: boolean): void {
    this._users.updateUserOnlineStatus(userId, online);
  }

  /**
   * Get the group member list.
   * @param groupId - Group ID.
   * @param ignoreCache - Whether to ignore the cache. Defaults to `true`.
   */
  async reqGroupMembers(groupId: string, ignoreCache: boolean = true): Promise<GroupMemberProfile[]> {
    return this._groups.reqGroupMembers(groupId, ignoreCache);
  }

  /**
   * Refresh group member data. If the member list differs from the cached `memberCount`,
   * the SDK updates `memberCount` and dispatches the relevant event.
   * @param groupId - Group ID.
   * @param members - New group member list.
   */
  updateGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    return this._groups.updateGroupMembers(groupId, members);
  }

  /**
   * Add group members, possibly triggering a member count change event.
   * @param groupId
   * @param members
   */
  addGroupMembers(groupId: string, members: GroupMemberProfile[]): void {
    return this._groups.addGroupMembers(groupId, members);
  }

  /**
   * Remove group members, possibly triggering a member count change event.
   * @param groupId - Group ID.
   * @param userIds - Member IDs to remove.
   */
  removeGroupMembers(groupId: string, userIds: string[]): void {
    return this._groups.removeGroupMembers(groupId, userIds);
  }
}
