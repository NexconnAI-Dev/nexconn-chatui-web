import { ReactiveController, ReactiveControllerHost } from 'lit';
import { i18nCore, LanguageChangeDetail } from './core';
import { LanguagePackEntries, LanguageDirection } from '../../languages';

/**
 * i18n Reactive Controller for Lit components.
 *
 * Usage:
 * ```typescript
 * class MyComponent extends LitElement {
 *   private i18n = new I18nController(this);
 *
 *   render() {
 *     return html`<div>${this.i18n.t('hello')}</div>`;
 *   }
 * }
 * ```
 *
 * Requests a component update when the language changes.
 */
export class I18nController implements ReactiveController {
  private _handleLanguageChange: EventListener;

  constructor(private host: ReactiveControllerHost) {
    this.host.addController(this);

    // Bind the event handler.
    this._handleLanguageChange = () => {
      // Request a component update after a language change.
      this.host.requestUpdate();
    };
  }

  /**
   * Starts listening for language changes when the component connects.
   */
  hostConnected(): void {
    i18nCore.addEventListener('languagechange', this._handleLanguageChange);
  }

  /**
   * Stops listening for language changes when the component disconnects.
   */
  hostDisconnected(): void {
    i18nCore.removeEventListener('languagechange', this._handleLanguageChange);
  }

  /**
   * Gets an entry for the current locale.
   */
  t(key: keyof LanguagePackEntries, ...args: Array<string | number>): string {
    return i18nCore.$tt(key, ...args);
  }

  /**
   * Checks whether an entry exists for the current locale.
   */
  has(key: keyof LanguagePackEntries): boolean {
    return i18nCore.$has(key);
  }

  /**
   * Gets the current language code.
   */
  get lang(): string {
    return i18nCore.lang;
  }

  /**
   * Gets the current writing direction.
   */
  get direction(): LanguageDirection {
    return i18nCore.direction;
  }
}
