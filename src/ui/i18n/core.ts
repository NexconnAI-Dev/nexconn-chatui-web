import { ChatUIContext } from '../../core/ChatUIContext';
import { LanguagePackEntries, LanguageDirection, languagePacks } from '../../languages';
import { InnerEvent } from '@lib/core/EventDefined';

/**
 * Language change event details.
 */
export interface LanguageChangeDetail {
  lang: string;
  direction: LanguageDirection;
}

/**
 * Framework-agnostic i18n core.
 * Uses EventTarget to publish language changes to the Signal and Lit adapters.
 */
class I18nCore extends EventTarget {
  private _lang = 'en_US';
  private _direction: LanguageDirection = 'ltr';

  get lang(): string {
    return this._lang;
  }

  get direction(): LanguageDirection {
    return this._direction;
  }

  /**
   * Initializes the core and listens for ChatUIContext language changes.
   */
  init(ctx: ChatUIContext): void {
    ctx.addEventListener(InnerEvent.LANGUAGE_CHANGE, (event) => {
      this._lang = event.data.lang;
      this._direction = event.data.direction;

      // Notify the Signal and Lit adapters of the language change.
      this.dispatchEvent(
        new CustomEvent<LanguageChangeDetail>('languagechange', {
          detail: {
            lang: this._lang,
            direction: this._direction,
          },
        })
      );
    });
  }

  /**
   * Gets an entry for the current locale.
   */
  $tt(key: keyof LanguagePackEntries, ...args: Array<string | number>): string {
    const entry = languagePacks[this._lang].entries[key as keyof LanguagePackEntries];
    if (!entry) {
      return key as string;
    }
    if (args.length === 0) {
      return entry;
    }
    return entry.replace(/\{\d+\}/g, (match) =>
      args[parseInt(match.substring(1, match.length - 1), 10)].toString()
    );
  }

  /**
   * Checks whether an entry exists for the current locale.
   */
  $has(key: keyof LanguagePackEntries): boolean {
    return !!languagePacks[this._lang].entries[key as keyof LanguagePackEntries];
  }
}

/**
 * Global singleton.
 */
export const i18nCore = new I18nCore();
