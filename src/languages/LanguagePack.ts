import { LanguagePackEntries } from './LanguagePackEntries';

/**
 * Language writing direction
 */
export type LanguageDirection = 'ltr' | 'rtl';

/**
 * Language pack data.
 */
export interface LanguagePack {
  /**
   * Language pack writing direction. Defaults to `ltr`.
   */
  direction: LanguageDirection;
  /**
   * Language pack entries.
   */
  entries: LanguagePackEntries;
}
