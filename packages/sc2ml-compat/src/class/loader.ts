import { _Window, Logger } from '../types';
import { buildLogger } from '../utils';
import type { ModInfo } from '../mod/modInfo';
import { SC2DataInfo } from './dataInfo';
import { SC2ModZip } from './modZip';
import type { SC2DataManager } from './dataManager';

export type ModOrderItem = {
  name: string,
  mod: ModInfo,
  from: 'Local',
};

export class ModLoader {
  readonly gSC2DataManager: SC2DataManager;
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
  private modZipMap = new Map<string, SC2ModZip>();

  constructor(gSC2DataManager: SC2DataManager) {
    this.gSC2DataManager = gSC2DataManager;
    this.thisWin = gSC2DataManager.thisWin;
    this.logger = buildLogger();
  }

  /**
   * Set (or replace) the parsed mod list. Called by the data manager during init.
   */
  setModList(mods: ModInfo[]) {
    this.modList = mods;
    this.modZipMap.clear();
    for (const mod of mods) {
      const meta = this.thisWin.YASCML.mods.find(item => item.name === mod.name);
      if (meta?.zip) this.modZipMap.set(mod.name, new SC2ModZip(meta.zip, mod, meta.md5));
    }
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
  getModCacheOneArray(): ModOrderItem[] {
    return this.modList.map(mod => ({ name: mod.name, mod, from: 'Local' }));
  }

  getModListName() {
    return this.getModAllName();
  }

  getModAllName(): string[] {
    return this.modList.map(mod => mod.name);
  }

  getModCacheMap(): ReadonlyMap<string, ModOrderItem> {
    return new Map(this.getModCacheOneArray().map(item => [ item.name, item ]));
  }

  getModCacheMapWithAlias(): ReadonlyMap<string, ModOrderItem> {
    const map = new Map<string, ModOrderItem>();
    for (const item of this.getModCacheOneArray()) {
      map.set(item.name, item);
      for (const alias of item.mod.alias) map.set(alias, item);
    }
    return map;
  }

  checkModCacheData(): boolean {
    return this.modList.every(mod => !!mod.name && !!mod.version);
  }

  checkModCacheUniq(): boolean {
    const names = this.getModCacheMapWithAlias();
    return names.size === this.modList.reduce((count, mod) => count + 1 + mod.alias.length, 0);
  }

  getModCacheByNameOne(name: string): ModOrderItem | undefined {
    const mod = this.modList.find(item => item.name === name);
    return mod ? { name: mod.name, mod, from: 'Local' } : (void 0);
  }

  /**
   * Get a parsed SC2ML mod by name or alias.
   */
  getModCacheByAliseOne(name: string): ModOrderItem | undefined {
    const mod = this.modList.find(m => m.name === name || m.alias.includes(name));
    return mod ? { name: mod.name, mod, from: 'Local' } : (void 0);
  }

  getModByNameOne(modName: string): ModOrderItem | undefined {
    return this.getModCacheByAliseOne(modName);
  }

  /**
   * Get the YASCML zip of a parsed SC2ML mod (name or alias).
   */
  getModZip(modName: string) {
    const info = this.getModCacheByAliseOne(modName)?.mod;
    return info ? this.modZipMap.get(info.name) : (void 0);
  }

  /**
   * All parsed SC2ML mods, as `{ name, mod, from }` (source is always 'Local' in YASCML).
   */
  getModCacheByFromType(_from: string): ModOrderItem[] {
    return this.modList.map(mod => ({ name: mod.name, mod, from: 'Local' }));
  }

  checkModConflictList() {
    // Delegate to the data manager so the result is consistent with
    // `modUtils.getModConflictInfo()` (origin-inclusive).
    return this.gSC2DataManager.getConflictResult().map((result, index) => ({
      mod: this.modList[index]?.cache ?? new SC2DataInfo(result.dataSource),
      result,
    }));
  }

  getModReadCache() {
    console.warn('sc2ml-compact: getModReadCache is unavailable; YASCML owns import storage');
    return (void 0);
  }

  getModEarlyLoadCache() {
    console.warn('sc2ml-compact: getModEarlyLoadCache is unavailable; scripts run directly');
    return (void 0);
  }

  getLoaderKeyConfig() {
    console.warn('sc2ml-compact: getLoaderKeyConfig is unavailable; YASCML owns storage configuration');
    return (void 0);
  }

  getIndexDBLoader() { console.warn('sc2ml-compact: IndexDBLoader is unavailable; use YASCML.mods'); return (void 0); }
  getLocalStorageLoader() { console.warn('sc2ml-compact: LocalStorageLoader is unavailable; use YASCML.mods'); return (void 0); }
  getLocalLoader() { console.warn('sc2ml-compact: LocalLoader is unavailable; use YASCML.mods'); return (void 0); }
  getRemoteLoader() { console.warn('sc2ml-compact: RemoteLoader is unavailable; use YASCML.mods'); return (void 0); }
  getLazyLoader() { console.warn('sc2ml-compact: LazyLoader is unavailable; use modUtils.lazyRegisterNewModZipData'); return (void 0); }
}
