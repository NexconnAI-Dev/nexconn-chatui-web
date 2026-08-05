import { InnerEvent } from "./EventDefined";
import { ChatUIEvent } from "./ChatUIEvent";

type Item = {
  target: any,
  once?: boolean,
  listener: any;
}

export class EventDispatcher<T> {
  private _listeners: Map<string | keyof T, Item[]> = new Map();

  addEventListener<K extends keyof T>(type: K | string, listener: (evt: T[K]) => void, target?: any): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.push({ target, listener });
    } else {
      this._listeners.set(type, [{ target, listener }]);
    }
  }

  onceEventListener<K extends keyof T>(type: K | string, listener: (evt: T[K]) => void, target?: any): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.push({ target, listener, once: true });
    } else {
      this._listeners.set(type, [{ target, listener, once: true }]);
    }
  }

  removeEventListener<K extends keyof T>(type: K | string, listener: (evt: T[K]) => void, target?: any): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      const index = listeners.findIndex((item) => item.listener === listener && item.target === target);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  removeEventListeners(type: string | keyof T): void {
    this._listeners.delete(type);
  }

  removeAllEventListeners(): void {
    this._listeners.clear();
  }

  /**
   * Dispatch an event and run listeners synchronously or asynchronously.
   * @description
   * When `defer` is `true`, listeners run in the next event loop instead of immediately.
   * @param event - Event object
   * @param defer - Run listeners asynchronously; defaults to `true`
   */
  dispatchEvent<K extends keyof T>(event: T[K], defer: boolean = true): void {
    if (defer) {
      setTimeout(() => this._handleDispatchEvent(event), 0);
    } else {
      this._handleDispatchEvent(event);
    }
  }

  private _handleDispatchEvent<K extends keyof T>(_evt: T[K]): void {
    const event: ChatUIEvent<string> = _evt as any;
    const listeners = this._listeners.get(event.type);

    if (__DEV__ && ![InnerEvent.AUDIO_PLAY_EVENT].includes(event.type as InnerEvent)) {
      console.debug("dispatchEvent -> type: ", event.type, " data: ", event.data);
    }

    if (!listeners || listeners.length === 0) {
      return;
    }

    for (const { target, once, listener } of listeners) {
      if (event.isImmediatePropagationStopped()) {
        return;
      }

      try {
        listener.call(target, event);
      } catch (error) {
        console.error(error);
      }

      if (once) {
        this.removeEventListener(event.type, listener, target);
      }
    }
  }
}
