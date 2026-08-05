import enUS from './en_US';
import zhCN from './zh_CN';

import { LanguagePackEntries } from './LanguagePackEntries';
import { LanguagePack, LanguageDirection } from './LanguagePack';

export type { LanguagePackEntries, LanguagePack, LanguageDirection };

/**
 * Internal language pack collection.
 */
export const languagePacks: Record<string, LanguagePack> = {
  en_US: { direction: 'ltr', entries: enUS },
  zh_CN: { direction: 'ltr', entries: zhCN },
};
