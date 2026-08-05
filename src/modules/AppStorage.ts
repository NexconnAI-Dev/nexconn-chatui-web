export interface IRootStorage {
  set: Function,
  get: Function,
  remove: Function,
  getKeys: Function
}

let rootStorage: IRootStorage;

export const createRootStorage = (w: Window): IRootStorage => {
  if (!rootStorage) {
    rootStorage = {
      set: (key: string, val: any) => {
        w.localStorage.setItem(key, JSON.stringify(val));
      },
      get: (key: string): any => {
        let val;
        try {
          val = JSON.parse(w.localStorage.getItem(key)!);
        } catch (e) {
          val = null;
        }
        return val;
      },
      remove: (key: string) => w.localStorage.removeItem(key),
      getKeys: (): string[] => {
        const keys = [];
        for (const key in w.localStorage) {
          keys.push(key);
        }
        return keys;
      },
    };
  }
  return rootStorage;
};

export class AppCache {
  private _caches: {[id: string]: any} = {}

  constructor(value?: {[id: string]: any}) {
    if (value) {
      this._caches = value;
    }
  }

  set(key: string, value: any) {
    this._caches[key] = value;
  }

  remove(key: string): any {
    const val = this.get(key);
    delete this._caches[key];
    return val;
  }

  get(key: string) {
    return this._caches[key];
  }

  getKeys():string[] {
    const keys: string[] = [];
    for (const key in this._caches) {
      keys.push(key);
    }
    return keys;
  }
}

export class AppStorage {
  private _cache: AppCache

  private _storageKey: string

  private _rootStorage: IRootStorage;

  constructor(w: Window, key: string) {
    this._rootStorage = createRootStorage(w);
    const localCache = this._rootStorage.get(key) || {};
    this._cache = new AppCache({
      [key]: localCache,
    });
    this._storageKey = key;
  }

  _get(): any {
    const key = this._storageKey;
    return this._cache.get(key) || {};
  }

  _set(cache: { [id: string]: any}) {
    const key = this._storageKey;
    cache = cache || {};
    this._cache.set(key, cache);
    this._rootStorage.set(key, cache);
  }

  set(key: string, value: any) {
    const localValue = this._get();
    localValue[key] = value;
    this._set(localValue);
  }

  remove(key: string) {
    const localValue = this._get();
    delete localValue[key];
    this._set(localValue);
  }

  clear() {
    const key = this._storageKey;
    this._rootStorage.remove(key);
    this._cache.remove(key);
  }

  get(key: string) {
    const localValue = this._get();
    return localValue[key];
  }

  getKeys():string[] {
    const localValue = this._get();
    const keyList: string[] = [];
    for (const key in localValue) {
      keyList.push(key);
    }
    return keyList;
  }

  getValues():any {
    return this._get() || {};
  }
}
