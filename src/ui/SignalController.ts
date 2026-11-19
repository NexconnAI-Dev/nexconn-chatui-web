import { ReactiveController, ReactiveControllerHost } from 'lit';
import { Signal, DerivedSignal } from './signal';

/**
 * Lit ReactiveController that subscribes to signals and requests component updates.
 *
 * @example
 * class MyComponent extends LitElement {
 *   private signals = new SignalController(this, [messageList, multiChoiceMode]);
 *
 *   render() {
 *     return html`<div>${messageList.value.length}</div>`;
 *   }
 * }
 */
export class SignalController implements ReactiveController {
  private _unsubscribers: Array<() => void> = [];
  private _signals = new Set<Signal<any> | DerivedSignal<any>>();
  private _connected = false;

  constructor(
    private host: ReactiveControllerHost,
    signals: Array<Signal<any> | DerivedSignal<any>> = []
  ) {
    signals.forEach(signal => this._signals.add(signal));
    this.host.addController(this);
  }

  /**
   * Adds a signal to watch.
   */
  watch(signal: Signal<any> | DerivedSignal<any>): void {
    if (this._signals.has(signal)) return;
    this._signals.add(signal);
    if (this._connected) this._watch(signal);
  }

  private _watch(signal: Signal<any> | DerivedSignal<any>): void {
    const unsub = signal.subscribe(() => this.host.requestUpdate());
    this._unsubscribers.push(unsub);
  }

  hostConnected(): void {
    if (this._connected) return;
    this._connected = true;
    this._signals.forEach(signal => this._watch(signal));
    this.host.requestUpdate();
  }

  hostDisconnected(): void {
    this._connected = false;
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}
