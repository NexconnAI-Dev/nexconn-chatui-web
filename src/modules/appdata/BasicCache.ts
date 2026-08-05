import { ChatUIContext } from "@lib/core/ChatUIContext";
import { ILogger } from "@nexconn/engine";
import { ChatUIStore } from "../ChatUIStore";

export interface ICachedData {
  usingDefault: boolean;
}

/**
 * Application data cache.
 * @description - Handles concurrent requests, caching, updates, and request throttling.
 */
export abstract class BasicCache<T extends ICachedData, D> {
  protected _cache: Map<string, T> = new Map();

  protected abstract readonly ReqStartTag: string;
  protected abstract readonly ReqFailedTag: string;
  protected abstract readonly ReqSuccessTag: string;

  protected abstract readonly GetDefaultTag: string;
  protected abstract readonly GetDefaultErrorTag: string;

  protected readonly logger: ILogger;

  protected readonly store: ChatUIStore;

  constructor(
    protected _ctx: ChatUIContext,
    protected _hook: (ids: string[]) => Promise<D[]>,
    protected _defaultHook?: (id: string) => D,
  ) {
    this.logger = _ctx.logger;
    this.store = _ctx.store;
  }

  /**
   * Compare cached data with requested data and update the cache when they differ.
   * @param data
   */
  protected abstract _checkAndUpdateCacheData(data: D): { cached: T; changed: boolean };

  /**
   * Validate data returned by the application hook.
   * @param data
   */
  protected abstract _isInvalid(data: D): boolean;

  /**
   * Dispatch an update notification.
   * @param datas
   */
  protected abstract _dispatchUpdateEvent(datas: T[]): void;

  private _requesting: Map<string, Promise<D[]>> = new Map();

  private _waitingList: Set<string> = new Set();

  private _waitingPromise: Promise<void> | undefined;

  /**
   * Add IDs to the pending list and wait until their requests complete.
   * @param ids
   */
  private async _push2Waiting(ids: string[]): Promise<void> {
    if (this._waitingPromise) {
      // Append new IDs to the existing pending list.
      ids.forEach((id) => this._waitingList.add(id));
    } else {
      // Create a pending list and issue the request after 200 ms.
      this._waitingList = new Set(ids);
      this._waitingPromise = new Promise((resolve) => {
        setTimeout(() => {
          const list = [...this._waitingList];
          this._waitingList.clear();
          this._request(list);
          this._waitingPromise = undefined;
          resolve();
        }, 200);
      });
    }

    // Wait for the request to be issued.
    await this._waitingPromise;
    // Wait for the request to complete.
    await Promise.all(ids.map((id) => this._requesting.get(id)!));
  }

  /**
   * @param ids - ID list.
   */
  private async _request(ids: string[]): Promise<void> {
    const traceId = this.logger.createTraceId();

    let promise: Promise<D[]> | undefined;
    try {
      this.logger.info(this.ReqStartTag, ids.join(","), traceId);
      // Request data from the application.
      promise = this._hook(ids);
      // Track the request.
      ids.forEach((id) => {
        this._requesting.set(id, promise!);
      });
    } catch (error: any) {
      this.logger.error(this.ReqFailedTag, error.message, traceId);
      return;
    }

    const result: D[] = await promise;
    if (result instanceof Array === false) {
      this.logger.error(this.ReqFailedTag, "result must be a Array", traceId);
      return;
    }

    const updateList: T[] = [];
    const validResult: D[] = result.filter((data, index) => {
      const bool = !this._isInvalid(data);
      if (!bool) {
        this.logger.warn(this.ReqFailedTag, `invalid value in position ${index}`, traceId);
        // Log invalid fields for diagnosis, but omit profile because it may not be serializable.
        console.error(`invalid value in position ${index}: `, data);
      } else {
        const { cached, changed } = this._checkAndUpdateCacheData(data);
        if (changed) {
          updateList.push(cached);
        }
      }
      return bool;
    });

    // Dispatch an update event.
    if (updateList.length > 0) {
      this._dispatchUpdateEvent(updateList);
    }

    this.logger.info(this.ReqSuccessTag, `valid value length: ${validResult.length}`, traceId);
  }

  /**
   * Request application data, then update the cache and dispatch a notification on success.
   * @param ids - ID list.
   * @param ignoreCache - Whether to ignore cached data.
   */
  public async reqData(ids: string[], ignoreCache: boolean = false): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const needRequestIds: string[] = ignoreCache
      ? ids.slice()
      : ids.filter((id) => {
        const profile = this._cache.get(id);
        return !profile || profile.usingDefault;
      });

    // No cache update is required.
    if (needRequestIds.length === 0) {
      return this.getCache(ids, true);
    }

    // Split needRequestIds into IDs already being requested and IDs requiring new requests.
    const inRequestingList: Promise<any>[] = [];
    const reqIds: string[] = [];

    needRequestIds.forEach((id) => {
      const reqPromise = this._requesting.get(id);
      if (reqPromise) {
        inRequestingList.includes(reqPromise) ||  inRequestingList.push(reqPromise);
      } else {
        reqIds.push(id);
      }
    });

    if (reqIds.length > 0) {
      inRequestingList.push(this._push2Waiting(reqIds));
    }

    if (inRequestingList.length > 0) {
      await Promise.all(inRequestingList);
    }

    // Read cached records again in the order of ids.
    return this.getCache(ids, true);
  }

  /**
   * Get cached data synchronously. Missing records return defaults and trigger asynchronous application requests.
   * The cache is updated and a notification is dispatched when each request completes.
   * @param ids - ID list.
   * @param cancelReq - When true, do not request data from the application.
   */
  public getCache(ids: string[], cancelReq?: boolean): T[] {
    if (ids.length === 0) {
      return [];
    }

    // Track IDs that must be requested from the application.
    const needRequestIds: string[] = [];

    const profiles: T[] = ids.map((id) => {
      const profile = this._cache.get(id);
      if (profile) {
        // Request records that currently use default data.
        if (profile.usingDefault) {
          needRequestIds.push(id);
        }
        return profile;
      }

      needRequestIds.push(id);

      // Create default data.
      const defaultProfile: T = this._getDefaultCache(id);
      // Update the cached record with default data.
      this._cache.set(id, defaultProfile);
      return defaultProfile;
    });

    if (!cancelReq && needRequestIds.length > 0) {
      this.reqData(needRequestIds, true);
    }

    return profiles;
  }

  private _getDefaultCache(id: string): T {
    let defaultProfile: D | undefined;

    if (this._defaultHook) {
      this.logger.info(this.GetDefaultTag, `id: ${id}`);
      try {
        defaultProfile = this._defaultHook(id);
      } catch (error: any) {
        this.logger.error(this.GetDefaultErrorTag, error.message);
      }

      if (defaultProfile && this._isInvalid(defaultProfile)) {
        this.logger.error(this.GetDefaultErrorTag, `id: ${id}`);
        defaultProfile = undefined;
      }
    }

    const result: T = this._createDefaultCache(id, defaultProfile);
    return result;
  }

  /**
   * Create default data.
   * @param id - ID
   * @param defaultProfile - Default data provided by the application.
   */
  protected abstract _createDefaultCache(id: string, defaultProfile?: D): T;

  public clear(): void {
    this._cache.clear();
  }
}
