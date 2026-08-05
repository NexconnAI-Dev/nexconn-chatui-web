import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIEvent } from '../core/ChatUIEvent';
import { LogTag } from '../enums/LogTag';
import { LanguagePackEntries, LanguageDirection, languagePacks } from '../languages';
import { ChatUIModule } from './ChatUIModule';

export class I18nModule extends ChatUIModule {
  protected _onInitUserCache(): void {
    // No action required.
  }

  protected _onDestroyUserCache(): void {
    // No action required.
  }

  public destroy(): void {
    // No action required.
  }

  /**
   * Get a copy of the built-in language pack entries.
   * @param lang Language pack to retrieve.
   */
  cloneLanguageEntries(lang: string): LanguagePackEntries | null {
    if (!languagePacks[lang]) {
      this.logger.error(LogTag.A_CLONE_LANGUAGE_ENTRIES_O, `Language pack '${lang}' not found.`);
      return null;
    }

    this.logger.info(LogTag.A_CLONE_LANGUAGE_ENTRIES_O, `lang: ${lang}`);
    return { ...languagePacks[lang].entries };
  }

  /**
   * Register a language pack or override an existing one. Only valid before `ready` is called.
   * @param lang - Language identifier, such as `zh_CN`.
   * @param entries - Language pack entries.
   * @param direction - Text direction. Defaults to 'LTR' and only applies on first registration.
   */
  registerLanguagePack(lang: string, entries: LanguagePackEntries, direction: LanguageDirection = 'ltr'): void {
    this.logger.info(LogTag.A_REGISTER_LANGUAGE_PACK_O, `lang: ${lang}, direction: ${direction}`);
    languagePacks[lang] = { direction, entries };
  }

  private _language: string = 'en_US';

  /**
   * Switch the active language.
   * @param lang - Target language.
   */
  setLanguage(lang: string): void {
    if (!languagePacks[lang]) {
      this.logger.error(LogTag.A_SET_LANGUAGE_O, `Language pack '${lang}' not found.`);
      return;
    }

    if (this._language === lang) {
      this.logger.warn(LogTag.A_SET_LANGUAGE_O, `Language '${lang}' already in use.`);
      return;
    }

    this.logger.info(LogTag.A_SET_LANGUAGE_O, `current: ${this._language}, target: ${lang}`);

    const { direction } = languagePacks[lang];
    this._language = lang;

    // Notify the UI to refresh after the language changes.
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.LANGUAGE_CHANGE, { lang, direction }));
  }

  /**
   * Get the active language.
   */
  getLanguage(): string {
    return this._language;
  }

  /**
   * Get the supported language list.
   * @returns
   */
  getSupportedLanguages(): string[] {
    return Object.keys(languagePacks);
  }

  /**
   * Get an entry string for the active language.
   * @param key
   */
  getEntryString(key: keyof LanguagePackEntries): string {
    return languagePacks[this._language]?.entries[key];
  }

  /**
   * Get an entry string by key and replace its placeholders with any supplied arguments.
   * @param key
   * @param args
   */
  format(key: keyof LanguagePackEntries, ...args:  Array<string | number>): string {
    const entry = languagePacks[this._language].entries[key];
    if (!entry) {
      return key as string;
    }
    return entry.replace(/\{\d+\}/g, (match, index) => args[parseInt(match.substring(1, match.length - 1), 10)].toString());
  }
}
