import { buildLogger } from '../utils';
import type { SC2DataManager } from './dataManager';

/**
 * Callbacks for life-cycle hook
 * 
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L19
 */
export interface ModLoaderControllerCallback {
  /**
   * Called before a mod is gonna being loaded. Return `false` will make the mod not being loaded.
   * 
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L25
   */
  canLoadThisMod(): Promise<boolean>;

  /**
   * Called after a mod being loaded.
   * 
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L33
   */
  afterModLoad(): Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L35
   */
  InjectEarlyLoad_start: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L37
   */
  InjectEarlyLoad_end: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L39
   */
  EarlyLoad_start: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L41
   */
  EarlyLoad_end: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L43
   */
  LazyLoad_start: (modName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L45
   */
  LazyLoad_end: (modName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L47
   */
  Load_start: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L49
   */
  Load_end: (modName: string, fileName: string) => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L51
   */
  PatchModToGame_start: () => Promise<any>;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L53
   */
  PatchModToGame_end: () => Promise<any>;

  /**
   * @deprecated Deprecated by upstream.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L58
   */
  ReplacePatcher_start: (modName: string, fileName: string) => Promise<any>;

  /**
   * @deprecated Deprecated by upstream.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L63
   */
  ReplacePatcher_end: (modName: string, fileName: string) => Promise<any>;
  
  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L68
   */
  ModLoaderLoadEnd: () => Promise<any>;
}

export type LifeTimeCircleHook = Partial<ModLoaderControllerCallback>;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L102
 */
const ModLoadControllerCallback_PatchHook = [
  'PatchModToGame_start',
  'PatchModToGame_end',
] as const;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L106
 */
const ModLoadControllerCallback_ModLoader = [
  'ModLoaderLoadEnd',
] as const;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L109
 */
const ModLoadControllerCallback_ReplacePatch = [
  'ReplacePatcher_start',
  'ReplacePatcher_end',
] as const;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L118
 */
const ModLoadControllerCallback_ScriptLoadHook = [
  'InjectEarlyLoad_start',
  'InjectEarlyLoad_end',
  'EarlyLoad_start',
  'EarlyLoad_end',
  'Load_start',
  'Load_end',
] as const;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L126
 */
const ModLoadControllerCallback_ScriptLazyLoadHook = [
  'LazyLoad_start',
  'LazyLoad_end',
] as const;

/**
 * A bunch of life-cycle hooks for mod to use.
 * 
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L144
 */
export class ModLoaderController implements ModLoaderControllerCallback {
  readonly gSC2DataManager: SC2DataManager;

  /**
   * Life-cycle hooks defined by mods.
   * 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L333
   */
  private lifeTimeCircleHookTable: Map<string, LifeTimeCircleHook> = new Map<string, LifeTimeCircleHook>();

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L78
   */
  readonly logInfo: (...args: any[]) => void;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L83
   */
  readonly logWarning: (...args: any[]) => void;

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L73
   */
  readonly logError: (...args: any[]) => void;

  // All these functions down below are life-cycle hooks. For some reason they are being defined in constructor.
  InjectEarlyLoad_start!: (modName: string, fileName: string) => Promise<any>;

  InjectEarlyLoad_end!: (modName: string, fileName: string) => Promise<any>;

  EarlyLoad_start!: (modName: string, fileName: string) => Promise<any>;

  EarlyLoad_end!: (modName: string, fileName: string) => Promise<any>;

  LazyLoad_start!: (modName: string) => Promise<any>;

  LazyLoad_end!: (modName: string) => Promise<any>;

  Load_start!: (modName: string, fileName: string) => Promise<any>;

  Load_end!: (modName: string, fileName: string) => Promise<any>;

  PatchModToGame_start!: () => Promise<any>;

  PatchModToGame_end!: () => Promise<any>;

  ReplacePatcher_start!: (modName: string, fileName: string) => Promise<any>;

  ReplacePatcher_end!: (modName: string, fileName: string) => Promise<any>;

  ModLoaderLoadEnd!: () => Promise<any>;

  constructor(gSC2DataManager: SC2DataManager) {
    this.gSC2DataManager = gSC2DataManager;

    const logger = buildLogger();
    this.logInfo = logger.log;
    this.logWarning = logger.warn;
    this.logError = logger.error;

    ModLoadControllerCallback_ScriptLoadHook.forEach((T) => {
      this[T] = async (modName: string, fileName: string) => {
        for (const [id, hook] of this.lifeTimeCircleHookTable) {
          try {
            if (hook[T]) {
              await hook[T]!.apply(hook, [modName, fileName]);
            }
          } catch (e: any | Error) {
            this.logError(`An error occurred when running hook: ${id}:${T}`);
            this.logError(e);
          }
        }
      };
    });

    ModLoadControllerCallback_ScriptLazyLoadHook.forEach((T) => {
      this[T] = async (modName: string) => {
        for (const [id, hook] of this.lifeTimeCircleHookTable) {
          try {
            if (hook[T]) {
              await hook[T]!.apply(hook, [modName]);
            }
          } catch (e) {
            this.logError(`An error occurred when running hook: ${id}:${T}`);
            this.logError(e);
          }
        }
      };
    });

    ModLoadControllerCallback_PatchHook.forEach((T) => {
      this[T] = async () => {
        for (const [id, hook] of this.lifeTimeCircleHookTable) {
          try {
            if (hook[T]) {
              await hook[T]!.apply(hook, []);
            }
          } catch (e) {
            this.logError(`An error occurred when running hook: ${id}:${T}`);
            this.logError(e);
          }
        }
      };
    });
  
    ModLoadControllerCallback_ModLoader.forEach((T) => {
      this[T] = async () => {
        for (const [ id, hook ] of this.lifeTimeCircleHookTable) {
          try {
            if (hook[T]) {
              await hook[T]!.apply(hook, []);
            }
          } catch (e) {
            this.logError(`An error occurred when running hook: ${id}:${T}`);
            this.logError(e);
          }
        }
      };
    });

    ModLoadControllerCallback_ReplacePatch.forEach((T) => {
      this[T] = async (modName: string, fileName: string) => {
        for (const [ id, hook ] of this.lifeTimeCircleHookTable) {
          try {
            if (hook[T]) {
              await hook[T]!.apply(hook, [modName, fileName]);
            }
          } catch (e) {
            this.logError(`An error occurred when running hook: ${id}:${T}`);
            this.logError(e);
          }
        }
      };
    });
  }

  /**
   * Add a bunch of life-cycle hook set's to controller.
   * 
   * @param {string} id - Hook set's ID. 
   * @param {LifeTimeCircleHook} hook - Life-cycle hooks.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L335
   */
  addLifeTimeCircleHook(id: string, hook: LifeTimeCircleHook) {
    if (this.lifeTimeCircleHookTable.has(id)) {
      this.logWarning(`Life-cycle hooks ID "${id}" already exists, this will replace the old hooks`);
    }
    this.lifeTimeCircleHookTable.set(id, hook);
  }

  /**
   * Save the mod to IndexedDB (delegates to the YASCML loader's `YASCML.mods.add`).
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L390
   */
  async addModIndexDB(data?: Blob | string) {
    if (data === undefined) return;
    await this.gSC2DataManager.thisWin.YASCML.mods.add(data);
  }

  /**
   * Save the mod to LocalStorage.
   * 
   * @deprecated We don't need this so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L362
   */
  addModLocalStorage() {}

  /**
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L302
   */
  async afterModLoad() {}

  /**
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L283
   */
  async canLoadThisMod() { return true; }

  /**
   * Get a mod's `boot.json` from provided Base64 data.
   * 
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L398
   */
  async checkModZipFileIndexDB() { return null; }

  /**
   * Get a mod's `boot.json` from provided Base64 data.
   * This is basically the same of {@link checkModZipFileIndexDB} but
   * I don't know why they made this.
   * 
   * @todo Type definition
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L370
   */
  async checkModZipFileLocalStorage() { return null; }

  /**
   * Remove all life-cycle hooks.
   * 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L354
   */
  clearLifeTimeCircleHook() {
    this.lifeTimeCircleHookTable.clear();
  }

  /**
   * Export all hooks data and zip them. Sadly this is defined by hooks so
   * I doubt the accuracy of the data.
   * 
   * @todo I think we can implement this.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L319
   */
  exportDataZip() { return null; }

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L402
   */
  getLog() {
    return buildLogger();
  }

  /**
   * Get all mods stored in IndexedDB (delegates to `YASCML.mods`).
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L382
   */
  async listModIndexDB() {
    return this.gSC2DataManager.thisWin.YASCML.mods.map(m => m.id);
  }

  /**
   * Get all mods stored in LocalStorage.
   * 
   * @deprecated We don't need this so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L358
   */
  listModLocalStorage() { return []; }

  /**
   * Get all "hidden mods" stored in IndexedDB.
   * 
   * @deprecated We don't have "hidden mods" so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L386
   */
  async loadHiddenModList() { return []; }

  /**
   * Set "hidden mods" list to IndexedDB.
   * 
   * @deprecated We don't have "hidden mods" so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L378
   */
  async overwriteModIndexDBHiddenModList() {}

  /**
   * Set mods list to IndexedDB.
   * 
   * @deprecated We don't need this so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L374
   */
  async overwriteModIndexDBModList() {}

  /**
   * Remove life-cycle hooks from controller.
   * 
   * @param {LifeTimeCircleHook} hook 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L343
   */
  removeLifeTimeCircleHook(hook: LifeTimeCircleHook) {
    for (const [id, h] of this.lifeTimeCircleHookTable) {
      if (h === hook) {
        this.lifeTimeCircleHookTable.delete(id);
        return;
      }
    }
  }

  /**
   * Remove a mod from IndexedDB.
   *
   * @todo YASCML's loader has no public mod-removal API yet; a removal hook is needed.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L394
   */
  async removeModIndexDB(_modId?: string) {}

  /**
   * Remove a mod from LocalStorage.
   * 
   * @deprecated We don't need this so it's not implemented.
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/ModLoadController.ts#L366
   */
  removeModLocalStorage() {}
}
