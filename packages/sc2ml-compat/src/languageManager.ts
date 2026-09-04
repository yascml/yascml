/**
 * Minimal language manager for SC2ML mod compatibility.
 *
 * Upstream's `LanguageManager` is far larger; the compact port only needs the
 * fields/methods real mods touch (`mainLanguage`, `setLanguage`). It maps to
 * `setup`-style state without the full i18n machinery.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/LanguageManager.ts
 */
export class LanguageManager {
  mainLanguage: string = 'en';

  setLanguage(lang: string) {
    this.mainLanguage = lang;
  }

  getLanguage(): string {
    return this.mainLanguage;
  }
}
