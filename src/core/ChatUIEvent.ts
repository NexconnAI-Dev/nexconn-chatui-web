/**
 * Base event class: Event<T, D = void, R = void>.
 * @template T - Event type
 * @template D - Event data type
 * @template R - Result type returned to the dispatcher through `evt.sendResult(data)`
 */
export class ChatUIEvent<T extends string, D=void, R = void> {
  /**
   * Tracks results returned to the dispatcher through `evt.sendResult(data)`.
   * - false: no result is awaited
   * - true: a result has been returned
   * - function: a result is pending
   */
  private _resolve: boolean | ((value: R | PromiseLike<R>) => void) = false;

  private _promise?: Promise<R>;

  private _stopped = false;

  private _defaultPrevented = false;

  /**
   * Event data
   */
  public readonly data: D;

  constructor(
    /**
     * Event type
     */
    public readonly type: T,
    data?: D,
  ) {
    this.data = data!;
  }

  /**
   * @returns Whether event propagation was stopped
   */
  public isImmediatePropagationStopped(): boolean {
    return this._stopped;
  }

  /**
   * Stop subsequent listeners for this event type.
   */
  public stopImmediatePropagation(): void {
    this._stopped = true;
  }

  /**
   * @returns Whether the default behavior was prevented
   */
  public isDefaultPrevented(): boolean {
    return this._defaultPrevented;
  }

  /**
   * Prevent the event's default behavior.
   * @description This does not stop propagation, and not every event has a default behavior.
   */
  public preventDefault(): void {
    this._defaultPrevented = true;
  }

  /**
   * Send result data to the event dispatcher.
   * @param data
   */
  public sendResult(data: R): void {
    if (typeof this._resolve === 'function') {
      this._resolve(data);
      this._resolve = true;
      return;
    }

    const errormsg = this._resolve ? 'Cannot resubmit.' : 'There is no transaction waiting event result.';
    console.error(errormsg, 'event type:', this.type);
  }

  /**
   * Wait for a listener to return result data.
   * @returns
   */
  public async awaitResult(): Promise<R> {
    if (!this._promise) {
      this._promise = new Promise<R>((resolve) => {
        this._resolve = resolve;
      });
    }
    return this._promise;
  }

  /**
   * Clone the event instance.
   * @param ignoreResult - Whether to ignore returned data. When true, the clone cannot return data through `evt.sendResult(data)`.
   * @returns
   */
  public clone(): ChatUIEvent<T, D, R> {
    const evt: ChatUIEvent<T, D, R> = new ChatUIEvent(this.type, this.data);
    evt.sendResult = this.sendResult.bind(this);
    return evt;
  }
}
