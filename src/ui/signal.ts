/**
 * Lightweight reactive Signal implementation.
 * Read and write through `.value`, and subscribe to changes.
 */

export type Subscriber = () => void;
export type Unsubscribe = () => void;

/**
 * Reactive signal.
 *
 * @example
 * const count = new Signal(0);
 * count.value++;  // Notifies subscribers.
 * count.subscribe(() => console.log('changed'));
 */
export class Signal<T> {
  private _value: T;
  private _subscribers = new Set<Subscriber>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this._notify();
    }
  }

  /**
   * Subscribes to signal changes.
   * @returns An unsubscribe function.
   */
  subscribe(subscriber: Subscriber): Unsubscribe {
    this._subscribers.add(subscriber);
    return () => this._subscribers.delete(subscriber);
  }

  private _notify(): void {
    this._subscribers.forEach(fn => fn());
  }

  /**
   * Forces a notification after an internal array or object change.
   */
  notify(): void {
    this._notify();
  }
}

/**
 * Derived signal.
 *
 * @example
 * const count = new Signal(0);
 * const doubled = derive(() => count.value * 2);
 * console.log(doubled.value);  // 0
 * count.value = 5;
 * console.log(doubled.value);  // 10
 */
export class DerivedSignal<T> {
  private _compute: () => T;
  private _cachedValue: T | undefined;
  private _dirty = true;
  private _dependencies = new Set<Signal<any>>();
  private _subscribers = new Set<Subscriber>();
  private _unsubscribers: Unsubscribe[] = [];
  /** Dependencies registered through dependOn; the value getter does not clear them. */
  private _manualDependencies = new Set<Signal<any>>();
  private _manualUnsubscribers: Unsubscribe[] = [];

  constructor(compute: () => T) {
    this._compute = compute;
  }

  get value(): T {
    if (this._dirty) {
      // Clear automatically collected dependencies while preserving manual ones.
      this._unsubscribers.forEach(unsub => unsub());
      this._unsubscribers = [];
      this._dependencies.clear();

      // Recompute and collect dependencies.
      this._cachedValue = this._compute();
      this._dirty = false;
    }
    return this._cachedValue!;
  }

  subscribe(subscriber: Subscriber): Unsubscribe {
    this._subscribers.add(subscriber);
    return () => this._subscribers.delete(subscriber);
  }

  private _notify(): void {
    this._dirty = true;
    this._subscribers.forEach(fn => fn());
  }

  /**
   * Registers a dependency when automatic dependency collection is unavailable.
   * Recalculation does not clear manual dependencies.
   */
  dependOn(signal: Signal<any>): void {
    if (!this._manualDependencies.has(signal)) {
      this._manualDependencies.add(signal);
      const unsub = signal.subscribe(() => this._notify());
      this._manualUnsubscribers.push(unsub);
    }
  }
}

/**
 * Creates a derived signal.
 */
export function derive<T>(compute: () => T): DerivedSignal<T> {
  return new DerivedSignal(compute);
}

/**
 * Watches signal changes.
 *
 * @example
 * const count = new Signal(0);
 * watch(count, (newVal, oldVal) => {
 *   console.log(`${oldVal} -> ${newVal}`);
 * });
 */
export function watch<T>(
  signal: Signal<T>,
  callback: (newValue: T, oldValue: T) => void,
  options?: { immediate?: boolean }
): Unsubscribe {
  let oldValue = signal.value;

  if (options?.immediate) {
    callback(signal.value, oldValue);
  }

  return signal.subscribe(() => {
    const newValue = signal.value;
    callback(newValue, oldValue);
    oldValue = newValue;
  });
}

/**
 * Creates a read-only signal.
 */
export function readonly<T>(signal: Signal<T>): { readonly value: T; subscribe: (fn: Subscriber) => Unsubscribe } {
  return {
    get value() { return signal.value; },
    subscribe: (fn: Subscriber) => signal.subscribe(fn),
  };
}
