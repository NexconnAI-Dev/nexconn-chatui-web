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

  constructor(
    private host: ReactiveControllerHost,
    signals: Array<Signal<any> | DerivedSignal<any>> = []
  ) {
    this.host.addController(this);
    signals.forEach(s => this._watch(s));
  }

  /**
   * Adds a signal to watch.
   */
  watch(signal: Signal<any> | DerivedSignal<any>): void {
    this._watch(signal);
  }

  private _watch(signal: Signal<any> | DerivedSignal<any>): void {
    const unsub = signal.subscribe(() => this.host.requestUpdate());
    this._unsubscribers.push(unsub);
  }

  hostConnected(): void {}

  hostDisconnected(): void {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}
