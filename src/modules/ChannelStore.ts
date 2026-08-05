import { cloneByJSON } from '@lib/helper/clone';
import { AppStorage } from './AppStorage';
import { ChannelIdentifier } from '@nexconn/chat';
import { trans2ChannelKey } from '@lib/helper';

interface ILocalChannelCacheData {
  lastReadTime?: number,
  sendReadReceiptTime?: number,
}

type ILocalChannelCacheDataKeys = keyof ILocalChannelCacheData

const CHANNELS_STATE_KEY = (appKey: string, curUserId: string) => {
  return `chatui-${appKey}-${curUserId}`
}

const StorageKey2ChannelKey: {[key: string]: {keyName: string, defaultVal: number}} = {
  lrt: { keyName: 'lastReadTime', defaultVal: 0 },
  srrt: { keyName: 'sendReadReceiptTime', defaultVal: 0 },
};

const ChannelKey2StorageKey: {[key:string]: string} = {};
for (const key in StorageKey2ChannelKey) {
  const { keyName } = StorageKey2ChannelKey[key];
  ChannelKey2StorageKey[keyName] = key;
}

/**
 * Stores local channel data. Currently maintained fields:
 * Read receipt timestamp for direct channels.
 */
export class ChannelStore {
  public readonly _localStore: AppStorage

  constructor (
    w: Window,
    _appkey: string,
    _currentUserId: string,
  ) {
    this._localStore = new AppStorage(w, CHANNELS_STATE_KEY(_appkey, _currentUserId));
  }

  /**
   * Get locally stored data for a channel.
   * @param type
   * @param targetId
   * @param channelId
   * @returns
   */
  get(identifier: ChannelIdentifier): ILocalChannelCacheData {
    const key = trans2ChannelKey(identifier);
    const local = this._localStore.get(key) || {};
    const cache: ILocalChannelCacheData = {};
    for (const key in StorageKey2ChannelKey) {
      const { keyName, defaultVal } = StorageKey2ChannelKey[key];
      cache[<ILocalChannelCacheDataKeys>keyName] = local[key] || cloneByJSON(defaultVal);
    }
    return cache;
  }

  /**
   * Store channel data.
   */
  set(identifier: ChannelIdentifier, cache: ILocalChannelCacheData) {
    const key = trans2ChannelKey(identifier);
    const local = this._localStore.get(key) || {};
    for (const key in cache) {
      const storageKey = ChannelKey2StorageKey[key];
      const val = cache[<ILocalChannelCacheDataKeys>key];
      if (storageKey === undefined || val === undefined) {
        continue;
      }

      const { defaultVal } = StorageKey2ChannelKey[storageKey];

      if (val === defaultVal) {
        // Omit default values to save storage; missing values resolve to their defaults.
        delete local[storageKey];
      } else {
        local[storageKey] = val;
      }
    }

    if (Object.keys(local).length > 0) {
      this._localStore.set(key, local);
      return;
    }
    this._localStore.remove(key);
  }

  /**
   * Clear locally stored data for a channel.
   * @param type
   * @param targetId
   * @param channelId
   */
  remove(identifier: ChannelIdentifier) {
    const key = trans2ChannelKey(identifier);
    this._localStore.remove(key);
  }

}
