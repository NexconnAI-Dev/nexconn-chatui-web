import { Signal, DerivedSignal, derive } from '../signal';

import { ChatUIContext } from '../../core/ChatUIContext';
import { LanguagePackEntries, LanguageDirection } from '../../languages';
import { i18nCore } from './core';

/**
 * Current writing direction.
 */
export const direction = new Signal<LanguageDirection>('ltr');

/**
 * Current language pack.
 */
export const lang = new Signal('en_US');

export function init(ctx: ChatUIContext): void {
  // Initialize the i18n core.
  i18nCore.init(ctx);

  // Synchronize language changes from the i18n core to signals.
  i18nCore.addEventListener('languagechange', ((event: CustomEvent) => {
    lang.value = event.detail.lang;
    direction.value = event.detail.direction;
  }) as EventListener);
}

/**
 * Returns a derived translation signal that updates when the language changes.
 */
export function $t(key: keyof LanguagePackEntries, ...args: Array<string | number>): DerivedSignal<string> {
  const signal = derive(() => $tt(key, ...args));
  signal.dependOn(lang);
  return signal;
}

/**
 * Gets an entry for the current locale.
 */
export function $tt(key: keyof LanguagePackEntries, ...args: Array<string | number>): string {
  // Read lang.value so derived signals track language changes.
  void lang.value;
  return i18nCore.$tt(key, ...args);
}

/**
 * Checks whether an entry exists for the current locale.
 */
export function $has(key: keyof LanguagePackEntries): boolean {
  return i18nCore.$has(key);
}
