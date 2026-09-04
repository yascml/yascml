import lodash from 'lodash';
import JSZip from 'jszip';
import { buildIdbRef, buildIdbKeyValRef } from '../ref';
import { _Window, Logger } from '../types';
import type { SC2DataManager } from './dataManager';
import type { PassageDataItem } from './dataInfo';
import { SC2DataInfo } from './dataInfo';
import { replaceMergeSC2DataInfoCache } from '../merge';
import { Twee2Passage, Twee2PassageR } from '../twee';
import { ModInfo } from '../mod/modInfo';
import { SimulateMergeResult } from '../simulateMerge';
import { SemVerToolsType } from '../semver';
import { parseModZip } from '../mod/modZip';

/**
 * The SC2ML mod-facing API, exposed as `window.modUtils`.
 *
 * Data read/write APIs operate on the in-memory model only (never the game-data DOM).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/Utils.ts
 */
export class ModUtils {
  readonly pSC2DataManager: SC2DataManager;
  readonly thisWin: _Window;

  constructor(dataManager: SC2DataManager, window: _Window) {
    this.pSC2DataManager = dataManager;
    this.thisWin = window;
  }

  getThisWindow() {
    return this.thisWin;
  }

  get version(): string {
    return __VERSION__;
  }

  // ---- mod lookup ----

  getModListName(): string[] {
    return this.pSC2DataManager.getModLoader().getModListName();
  }

  getModListNameNoAlias(): string[] {
    return this.pSC2DataManager.getModLoader().getModListName();
  }

  getAnyModByNameNoAlias(name: string) {
    return this.pSC2DataManager.getModLoader().getModCacheByNameOne(name)?.mod;
  }

  getMod(name: string): ModInfo | undefined {
    return this.pSC2DataManager.getModLoader().getModCacheByAliseOne(name)?.mod;
  }

  getModAndFromInfo(name: string): { name: string, mod: ModInfo, from: string } | undefined {
    return this.pSC2DataManager.getModLoader().getModCacheByAliseOne(name);
  }

  getAllModInfoByFromType(_from: string): { name: string, mod: ModInfo, from: string }[] {
    return this.pSC2DataManager.getModLoader().getModCacheByFromType(_from);
  }

  getModZip(modName: string) {
    return this.pSC2DataManager.getModLoader().getModZip(modName);
  }

  // ---- passage / data access ----

  getPassageData(name: string): PassageDataItem | undefined {
    return this.pSC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.map.get(name);
  }

  getAllPassageData(): PassageDataItem[] {
    return this.pSC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.items;
  }

  createNewSC2DataInfoFromNow(): SC2DataInfo {
    return this.pSC2DataManager.getSC2DataInfoAfterPatch();
  }

  /**
   * Batch-update passages. Exists → overwrite; missing → create.
   * In-memory only: updates the after-patch cache and the virtual passage table.
   */
  updatePassageDataMany(pd: PassageDataItem[], _replaceForce: boolean = false) {
    const tt = this.pSC2DataManager.getSC2DataInfoAfterPatch();
    const ti = new SC2DataInfo('temp');
    ti.passageDataItems.items = pd;
    ti.passageDataItems.fillMap();

    replaceMergeSC2DataInfoCache(tt, ti);
    this.pSC2DataManager.flushAfterPatchCache();
    return this.pSC2DataManager.getSC2DataInfoAfterPatch();
  }

  /**
   * Update a single passage (overwrite or create). In-memory only.
   *
   * @deprecated use `CodeExample/how-to-modify-sc2data.ts` instead.
   */
  updatePassageData(name: string, content: string, tags: string[] = [], pid: number = 0) {
    console.warn('updatePassageData() is deprecated, use `CodeExample/how-to-modify-sc2data.ts` instead');
    this.pSC2DataManager.updateModPassageData(name, content, tags, pid);
    return this.pSC2DataManager.flushAfterPatchCache();
  }

  /**
   * Replace the whole in-memory data model with a new one (no DOM rewrite).
   * This is the no-DOM equivalent of upstream's `replaceFollowSC2DataInfo`.
   */
  replaceFollowSC2DataInfo(newSC2Data: SC2DataInfo, _oldSC2DataCache?: unknown) {
    this.pSC2DataManager.setAfterPatchCache(newSC2Data);
    return this.pSC2DataManager.flushAfterPatchCache();
  }

  splitPassageFromTweeFile(fileString: string): Twee2PassageR[] {
    return Twee2Passage(fileString);
  }

  getModConflictInfo(): { mod: SC2DataInfo, result: SimulateMergeResult }[] {
    const results = this.pSC2DataManager.getConflictResult();
    const mods = this.pSC2DataManager.getModLoader().getModCacheArray();
    return results.map((result, i) => ({
      mod: mods[i]?.cache ?? new SC2DataInfo(result.dataSource),
      result,
    }));
  }

  // ---- string / replace helpers ----

  escapedPatternString(pattern: string): string {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  tryStringSearch(
    content: string,
    searchString: string,
    positionHint: number,
    tolerance1: number = 0,
    tolerance2Negative: number = 0,
    tolerance2Positive: number = 0,
  ): number | undefined {
    const s = content;
    const from = searchString;
    const pos = positionHint;
    if (s.substring(pos, pos + from.length) === from) return pos;

    if (tolerance1 > 0) {
      for (let i = pos - tolerance1; i <= pos + tolerance1; i++) {
        if (s.substring(i, i + from.length) === from) return i;
      }
    }

    if (tolerance2Negative !== 0 || tolerance2Positive !== 0) {
      try {
        const re = new RegExp(this.escapedPatternString(from), '');
        const startPos = Math.max(0, pos - tolerance2Negative);
        const endPos = Math.min(s.length, pos + from.length + tolerance2Positive);
        const mm = re.exec(s.substring(startPos, endPos));
        if (mm) return startPos + mm.index;
      } catch (e) {
        console.error(e);
      }
    }
    return undefined;
  }

  tryStringReplace(
    content: string,
    searchString: string,
    replaceString: string,
    positionHint: number,
    tolerance1: number = 0,
    tolerance2Negative: number = 0,
    tolerance2Positive: number = 0,
  ): string {
    const pStart = this.tryStringSearch(
      content, searchString, positionHint,
      tolerance1, tolerance2Negative, tolerance2Positive,
    );
    if (pStart !== undefined) {
      return content.substring(0, pStart) + replaceString + content.substring(pStart + searchString.length);
    }
    console.warn('tryStringReplace() cannot find', [searchString, positionHint]);
    return content;
  }

  insertStringInPosition(content: string, insertString: string, position: number): string {
    return content.slice(0, position) + insertString + content.slice(position);
  }

  // ---- misc / tools ----

  getLodash() {
    return lodash;
  }

  getModLoadController() {
    return this.pSC2DataManager.getModLoadController();
  }

  getModLoader() {
    return this.pSC2DataManager.getModLoader();
  }

  getAddonPluginManager() {
    return this.pSC2DataManager.getAddonPluginManager();
  }

  getLogger(): Logger {
    return this.pSC2DataManager.getModLoadController().getLog();
  }

  getSemVerTools() {
    return new SemVerToolsType();
  }

  getNowRunningModName(): string | undefined {
    return this.pSC2DataManager.runningModName;
  }

  async getImage(imagePath: string): Promise<string | undefined> {
    return this.pSC2DataManager.getHtmlTagSrcHook().requestImageBySrc(imagePath);
  }

  getIdbRef() {
    return buildIdbRef();
  }

  getIdbKeyValRef() {
    return buildIdbKeyValRef();
  }

  /**
   * Lazy-register a new mod zip at runtime (no ModPack support; plain zips only).
   */
  async lazyRegisterNewModZipData(data: Blob | ArrayBuffer | Uint8Array, _options?: unknown) {
    console.log('lazyRegisterNewModZipData', data);
    try {
      const zip = await JSZip.loadAsync(data);
      const mod = await parseModZip(zip);
      const mods = this.pSC2DataManager.getModLoader().getModCacheArray();
      if (mods.find(m => m.name === mod.name)) {
        console.warn(`lazyRegisterNewModZipData: mod [${mod.name}] already loaded`);
        return false;
      }
      mods.push(mod);
      this.pSC2DataManager.getModLoader().setModList(mods);
      await this.pSC2DataManager.runModPreloadScripts(mod);
      await this.pSC2DataManager.drainScriptTasks();
      this.pSC2DataManager.rebuildAll();
      return mod;
    } catch (e) {
      console.error(e);
      this.getLogger().error(`lazyRegisterNewMod() error:[${(e as Error)?.message ?? e}]`);
      return false;
    }
  }

  /**
   * ModPack parsing is not supported (crypto out of scope).
   */
  async parseModPack(_modPackBuffer: Uint8Array, _password?: string) {
    throw new Error('sc2ml-compat: ModPack format is not supported');
  }

  getLanguageManager() {
    return (void 0);
  }

  getNowMainLanguage(): string {
    return 'en';
  }

  getAddonParamsFromModInfo(
    modInfo: ModInfo,
    addonPluginModName: string,
    addonName: string,
  ) {
    return modInfo.bootJson.addonPlugin?.find(item => (
      item.modName === addonPluginModName && item.addonName === addonName
    ))?.params;
  }
}
