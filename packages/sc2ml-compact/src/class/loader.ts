import { _Window, Logger } from '../types';
import { buildLogger } from '../utils';
import type { ModInfo } from '../mod/modInfo';

export class ModLoader {
  readonly thisWin: _Window;
  /**
   * Public logger, part of the SC2ML mod-facing API.
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModLoader.ts
   */
  readonly logger: Logger;

  /**
   * Parsed SC2ML mods, in load order.
   */
  private modList: ModInfo[] = [];

  constructor(window: _Window) {
    this.thisWin = window;
    this.logger = buildLogger();
  }

  /**
   * Set (or replace) the parsed mod list. Called by the data manager during init.
   */
  setModList(mods: ModInfo[]) {
    this.modList = mods;
  }

  /**
   * Get the parsed mod list (in load order).
   */
  getModCacheArray(): ModInfo[] {
    return this.modList;
  }

  /**
   * Get the parsed mod list as mod order items (upstream-compatible alias).
   */
  getModCacheOneArray(): { name: string, mod: ModInfo | null }[] {
    return this.modList.map(mod => ({ name: mod.name, mod }));
  }

  getModListName() {
    return this.thisWin.YASCML.mods.map(e => e.name);
  }

  getModCacheByNameOne(name: string) {
    const index = this.thisWin.YASCML.mods.findIndex(e => e.name === name);
    if (index === -1) return null;
    return this.thisWin.YASCML.mods[index];
  }

  /**
   * Get a parsed SC2ML mod by name or alias.
   */
  getModCacheByAliseOne(name: string): ModInfo | undefined {
    return this.modList.find(m => m.name === name || m.alias.includes(name));
  }

  /**
   * Get the parsed SC2ML mod whose name (or alias) matches `modName`.
   */
  getModCacheByNameOneModInfo(modName: string): ModInfo | undefined {
    return this.getModCacheByAliseOne(modName);
  }

  /**
   * Get the YASCML zip of a parsed SC2ML mod (name or alias).
   */
  getModZip(modName: string) {
    const mod = this.thisWin.YASCML.mods.find(m => m.name === modName);
    return mod?.zip;
  }

  /**
   * All parsed SC2ML mods, as `{ name, mod, from }` (source is always 'Local' in YASCML).
   */
  getModCacheByFromType(_from: string) {
    return this.modList.map(mod => ({ name: mod.name, mod, from: 'Local' }));
  }
}
