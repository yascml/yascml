import { ModLoader } from './loader';
import { SC2DataInfo, SC2DataInfoCache } from './dataInfo';
import { HtmlTagSrcHook } from './htmlSrcHook';
import { ModLoaderController } from './modLoadController';
import { ModUtils } from './modUtils';
import { _Window } from '../types';
import { ModInfo, Sc2mlCacheData } from '../mod/modInfo';
import { buildModInfoFromCache, parseModZip, Sc2mlCacheFilePath } from '../mod/modZip';
import { normalMergeSC2DataInfoCache, replaceMergeSC2DataInfoCache } from '../merge';
import { ReplacePatcher } from '../replacePatcher';
import { check, checkFor, checkGameVersion } from '../dependenceChecker';
import { simulateMergeSC2DataInfoCache, SimulateMergeResult } from '../simulateMerge';
import { executeScript, injectEarlyScript, loadStyle } from '../script';
import { Sc2EventTracer } from '../eventTracer';

/**
 * The main entry of SugarCube-2-ModLoader
 *
 * This port does NOT rewrite the game's `tw-storydata` DOM. Instead it:
 *  - parses SC2ML mods into in-memory `ModInfo`s,
 *  - auto-runs their `inject_early` / `earlyload` scripts,
 *  - merges mod data + applies replace patches in memory,
 *  - exposes the merged (new/overridden) passages through a single
 *    `YASCHook.passage` middleware, so the engine sees them as virtual passages
 *    without ever touching the stored game-data DOM.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataManager.ts#L23
 */
export class SC2DataManager {
  readonly thisWin: _Window;
  readonly modLoader: ModLoader;
  readonly modLoadController: ModLoaderController;
  readonly htmlTagSrcHook: HtmlTagSrcHook;
  readonly modUtils: ModUtils;
  readonly eventTracer: Sc2EventTracer;

  /**
   * Is this data manager has been initialized?
   */
  startInitOk = false;

  /**
   * Merged game data (origin + mods, replace patches applied).
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataManager.ts#L302
   */
  cSC2DataInfoAfterPatchCache?: SC2DataInfo;

  /**
   * Original game data (read-only snapshot of the story data DOM).
   */
  originSC2DataInfoCache?: SC2DataInfoCache;

  /**
   * Per-mod conflict results (name-sets an earlier mod's data would be overwritten by).
   */
  conflictResult: SimulateMergeResult[] = [];

  /**
   * Effective passage content contributed by mods (new or overridden passages),
   * keyed by passage name. Served to the engine via the passage middleware.
   */
  modPassageDataMap: Map<string, string> = new Map();

  /**
   * The name of the mod whose script is currently executing (for `getNowRunningModName`).
   */
  runningModName?: string;

  private passageMiddlewareRegistered = false;

  constructor(window: _Window) {
    this.thisWin = window;
    this.modLoader = new ModLoader(this);
    this.modUtils = new ModUtils(this, this.thisWin);
    this.modLoadController = new ModLoaderController(this);
    this.htmlTagSrcHook = new HtmlTagSrcHook(this);
    this.eventTracer = new Sc2EventTracer(this);
  }

  getModUtils() {
    return this.modUtils;
  }

  getSc2EventTracer() {
    return this.eventTracer;
  }

  /**
   * Validate that the game exposes the SugarCube 2 story-data structure needed
   * by the compact compatibility layer. Read-only; never changes the DOM.
   * Non-critical anomalies are reported as warnings rather than hard failures.
   */
  checkSC2Data() {
    const rootNodes = this.thisWin.document.getElementsByTagName('tw-storydata');
    if (rootNodes.length !== 1) {
      console.error(`checkSC2Data(): expected one <tw-storydata>, found ${rootNodes.length}`);
      return false;
    }
    const root = rootNodes[0];
    const styles = root.getElementsByTagName('style');
    const scripts = root.getElementsByTagName('script');
    const passages = root.getElementsByTagName('tw-passagedata');
    if (styles.length !== 1) console.warn(`checkSC2Data(): expected 1 <style>, found ${styles.length}`);
    if (scripts.length !== 1) console.warn(`checkSC2Data(): expected 1 <script>, found ${scripts.length}`);
    if (passages.length < 1) {
      console.error(`checkSC2Data(): no <tw-passagedata> found (${passages.length})`);
      return false;
    }
    return true;
  }

  /**
   * Compatibility facade for the upstream DependenceChecker instance (cached).
   */
  private dependenceCheckerFacade?: {
    checkFor: (mod: ModInfo, loaded: ModInfo[]) => boolean,
    check: () => boolean,
    checkGameVersion: (gameVersion: string) => boolean,
  };

  getDependenceChecker() {
    if (!this.dependenceCheckerFacade) {
      this.dependenceCheckerFacade = {
        checkFor: (mod: ModInfo, loaded: ModInfo[]) => checkFor(mod, loaded),
        check: () => check(this.modLoader.getModCacheArray()),
        checkGameVersion: (gameVersion: string) => checkGameVersion(gameVersion, this.modLoader.getModCacheArray()),
      };
    }
    return this.dependenceCheckerFacade;
  }

  /**
   * Unsupported in the compact no-DOM port. Passage middleware provides the
   * supported virtual-passage extension point instead.
   */
  getPassageTracer() {
    console.warn('sc2ml-compact: PassageTracer is unavailable in the no-DOM port');
    return (void 0);
  }

  getLanguageManager() {
    console.warn('sc2ml-compact: LanguageManager is unavailable in the compact port');
    return (void 0);
  }

  getJsPreloader() {
    console.warn('sc2ml-compact: JsPreloader is unavailable; use getNowRunningModName()');
    return (void 0);
  }

  getAddonPluginManager() {
    console.warn('sc2ml-compact: AddonPluginManager is unavailable in the compact port');
    return (void 0);
  }

  getSC2JsEvalContext() {
    console.warn('sc2ml-compact: SC2JsEvalContext is unavailable in the compact port');
    return (void 0);
  }

  getWikifyTracer() {
    console.warn('sc2ml-compact: WikifyTracer is unavailable; use YASCHook.passage instead');
    return (void 0);
  }

  /**
   * Clear {@link originSC2DataInfoCache|SC2DataManager.originSC2DataInfoCache}.
   * We won't clear {@link cSC2DataInfoAfterPatchCache|SC2DataManager.cSC2DataInfoAfterPatchCache} since
   * we need to use these data later.
   */
  cleanAllCacheAfterModLoadEnd() {
    if (this.originSC2DataInfoCache) {
      this.originSC2DataInfoCache.clean();
      this.originSC2DataInfoCache.destroy();
      this.originSC2DataInfoCache = (void 0);
    }
  }

  /**
   * Read current game data and return a {@link SC2DataInfoCache} based on it.
   */
  createNewSC2DataInfoFromNow() {
    return new SC2DataInfoCache(
      'orgin', // https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataManager.ts#L121
      Array.from(this.scriptNode!),
      Array.from(this.styleNode!),
      this.passageDataNodeList!,
    );
  }

  earlyResetSC2DataInfoCache() {
    this.initSC2DataInfoCache();
    this.flushAfterPatchCache();
  }

  /**
   * (Re)create {@link cSC2DataInfoAfterPatchCache|SC2DataManager.cSC2DataInfoAfterPatchCache}.
   *
   * In this no-DOM port the after-patch cache is maintained in memory, so flushing
   * re-derives the virtual passage table rather than re-reading the DOM.
   */
  flushAfterPatchCache() {
    this.rebuildModPassageFromAfterPatch();
    return this.cSC2DataInfoAfterPatchCache;
  }

  /**
   * Get {@link htmlTagSrcHook|SC2DataManager.htmlTagSrcHook}.
   */
  getHtmlTagSrcHook() {
    return this.htmlTagSrcHook;
  }

  /**
   * Get {@link modLoadController|SC2DataManager.modLoadController}.
   */
  getModLoadController() {
    return this.modLoadController;
  }

  /**
   * Get {@link modLoader|SC2DataManager.modLoader}.
   */
  getModLoader() {
    return this.modLoader;
  }

  /**
   * Get {@link cSC2DataInfoAfterPatchCache|SC2DataManager.cSC2DataInfoAfterPatchCache}.
   */
  getSC2DataInfoAfterPatch() {
    this.initSC2DataInfoCache();
    if (!this.cSC2DataInfoAfterPatchCache) {
      // Fallback before/without a merge: a clone of the origin snapshot.
      this.cSC2DataInfoAfterPatchCache = this.originSC2DataInfoCache!.cloneSC2DataInfo();
    }
    return this.cSC2DataInfoAfterPatchCache;
  }

  /**
   * Replace the in-memory after-patch cache and refresh the virtual passage table.
   * (No-DOM equivalent of a full `replaceFollowSC2DataInfo` write.)
   */
  setAfterPatchCache(cache: SC2DataInfo) {
    if (this.cSC2DataInfoAfterPatchCache && this.cSC2DataInfoAfterPatchCache !== cache) {
      this.cSC2DataInfoAfterPatchCache.destroy();
    }
    this.cSC2DataInfoAfterPatchCache = cache;
    this.rebuildModPassageFromAfterPatch();
    return this.cSC2DataInfoAfterPatchCache;
  }

  /**
   * Update a single passage in the in-memory after-patch cache and the virtual passage table.
   */
  updateModPassageData(name: string, content: string, tags: string[] = [], pid: number = 0) {
    const cache = this.getSC2DataInfoAfterPatch();
    cache.passageDataItems.items = cache.passageDataItems.items.filter(i => i.name !== name);
    cache.passageDataItems.items.push({ id: pid, name, tags, content });
    cache.passageDataItems.fillMap();
    this.modPassageDataMap.set(name, content);
  }

  /**
   * Get {@link conflictResult}.
   */
  getConflictResult(): SimulateMergeResult[] {
    return this.conflictResult;
  }

  /**
   * Apply every parsed SC2ML replace patch to an in-memory data cache.
   */
  async applyReplacePatcher(modSC2DataInfoCache: SC2DataInfo) {
    for (const mod of this.modLoader.getModCacheArray()) {
      for (const { fileName, patchInfo } of mod.replacePatchers) {
        await this.modLoadController.ReplacePatcher_start(mod.name, fileName);
        new ReplacePatcher(mod.name, fileName, patchInfo).applyReplacePatcher(modSC2DataInfoCache);
        await this.modLoadController.ReplacePatcher_end(mod.name, fileName);
      }
    }
    return modSC2DataInfoCache;
  }

  /**
   * No-DOM equivalent of upstream patchModToGame(): merge all parsed mods,
   * apply replace patches, then refresh the virtual passage table.
   */
  async patchModToGame() {
    await this.modLoadController.PatchModToGame_start();
    this.buildMergedData(this.modLoader.getModCacheArray());
    await this.modLoadController.PatchModToGame_end();
    return this.getSC2DataInfoAfterPatch();
  }

  makePassageNode(_item?: unknown) {
    console.warn('sc2ml-compact: makePassageNode is unavailable in the no-DOM port');
    return (void 0);
  }

  makeStyleNode(_data?: unknown) {
    console.warn('sc2ml-compact: makeStyleNode is unavailable in the no-DOM port');
    return (void 0);
  }

  makeScriptNode(_data?: unknown) {
    console.warn('sc2ml-compact: makeScriptNode is unavailable in the no-DOM port');
    return (void 0);
  }

  rePlacePassage(_remove?: Element[], _add?: Element[]) {
    console.warn('sc2ml-compact: rePlacePassage is unavailable in the no-DOM port');
    return (void 0);
  }

  /**
   * Get (or create) {@link originSC2DataInfoCache|SC2DataManager.originSC2DataInfoCache}.
   */
  getSC2DataInfoCache() {
    this.initSC2DataInfoCache();
    return this.originSC2DataInfoCache!;
  }

  /**
   * Create {@link originSC2DataInfoCache|SC2DataManager.originSC2DataInfoCache}.
   */
  initSC2DataInfoCache() {
    if (!this.originSC2DataInfoCache) {
      this.originSC2DataInfoCache = new SC2DataInfoCache(
        'orgin',
        Array.from(this.scriptNode!),
        Array.from(this.styleNode!),
        this.passageDataNodeList!,
      );
    }
  }

  /**
   * Initialize this data manager (runs during the loader's preload phase, before the engine boots).
   */
  async startInit() {
    if (this.startInitOk) return;
    this.startInitOk = true;

    if (!this.checkSC2Data()) {
      console.warn('sc2ml-compact: game story data looks unusual; continuing anyway');
    }

    this.initSC2DataInfoCache();

    const mods = await this.collectMods();
    this.modLoader.setModList(mods);

    // Inject `inject_early` + run `earlyload` scripts for every mod.
    for (const mod of mods) {
      await this.runModPreloadScripts(mod);
    }

    // Validate dependencies across the final mod order.
    if (!check(mods)) {
      console.warn('sc2ml-compact: some mod dependencies are not satisfied');
    }

    // Detect per-mod conflicts (dry-run merge).
    this.updateConflictResult(mods);

    // Merge mod data + apply replace patches in memory, build the virtual passage table.
    this.buildMergedData(mods);

    // Inject mod styles as standalone `<style>` elements (additive).
    for (const mod of mods) {
      for (const item of mod.cache.styleFileItems.items) {
        loadStyle(item.content, { modName: mod.name, filename: item.name });
      }
    }

    // Single injection point: expose mod-provided passages to the engine.
    this.registerPassageMiddleware();

    // Subscribe to engine-native SC2 runtime events (`:storyready`, `:passage*`).
    this.eventTracer.init();

    // User scripts (scriptFileList) + `preload` lists run after the engine boots.
  };

  /**
   * Run post-engine scripts (`scriptFileList` user scripts, then `scriptFileList_preload`).
   * Called from the postload phase.
   */
  async runPostloadScripts() {
    const mods = this.modLoader.getModCacheArray();

    // User scripts (would be `text/twine-javascript` in a DOM rewrite).
    for (const mod of mods) {
      for (const item of mod.cache.scriptFileItems.items) {
        await this.modLoadController.Load_start(mod.name, item.name);
        this.runningModName = mod.name;
        try {
          await executeScript(item.content);
        } catch (e) {
          console.error(`sc2ml-compact: user script error [${mod.name}] [${item.name}]`, e);
        } finally {
          this.runningModName = (void 0);
        }
        await this.modLoadController.Load_end(mod.name, item.name);
      }
    }

    // Preload scripts.
    for (const mod of mods) {
      for (const [ fileName, content ] of mod.scriptFileList_preload) {
        await this.modLoadController.Load_start(mod.name, fileName);
        this.runningModName = mod.name;
        try {
          await executeScript(content);
        } catch (e) {
          console.error(`sc2ml-compact: preload script error [${mod.name}] [${fileName}]`, e);
        } finally {
          this.runningModName = (void 0);
        }
        await this.modLoadController.Load_end(mod.name, fileName);
      }
    }

    await this.modLoadController.ModLoaderLoadEnd();
  };

  /**
   * Run a single mod's pre-engine scripts: `inject_early` (as DOM scripts) then
   * `earlyload` (executed). Used during `startInit` and lazy registration.
   */
  async runModPreloadScripts(mod: ModInfo) {
    for (const [ fileName, content ] of mod.scriptFileList_inject_early) {
      await this.modLoadController.InjectEarlyLoad_start(mod.name, fileName);
      injectEarlyScript(content, { modName: mod.name, filename: fileName, stage: 'InjectEarlyLoad' });
      await this.modLoadController.InjectEarlyLoad_end(mod.name, fileName);
    }

    for (const [ fileName, content ] of mod.scriptFileList_earlyload) {
      await this.modLoadController.EarlyLoad_start(mod.name, fileName);
      this.runningModName = mod.name;
      try {
        await executeScript(content);
      } catch (e) {
        console.error(`sc2ml-compact: earlyload script error [${mod.name}] [${fileName}]`, e);
      } finally {
        this.runningModName = (void 0);
      }
      await this.modLoadController.EarlyLoad_end(mod.name, fileName);
    }
  }

  /**
   * Collect and parse all enabled/suitable SC2ML mods from the YASCML loader.
   * Uses the embedded pre-parse cache when available; falls back to a live parse.
   */
  private async collectMods(): Promise<ModInfo[]> {
    const result: ModInfo[] = [];
    for (const mod of this.thisWin.YASCML.mods) {
      if (!mod.enabled || !mod.suitable || !mod.zip) continue;

      try {
        let info: ModInfo | null = null;
        const cacheFile = mod.zip.file(Sc2mlCacheFilePath);
        if (cacheFile) {
          const cache = JSON.parse(await cacheFile.async('string')) as Sc2mlCacheData;
          info = await buildModInfoFromCache(mod.zip, cache);
        }
        if (!info) {
          info = await parseModZip(mod.zip);
        }
        if (!await this.modLoadController.canLoadThisMod(info.bootJson, mod.zip)) {
          continue;
        }
        result.push(info);
        await this.modLoadController.afterModLoad(info.bootJson, mod.zip, info);
      } catch (e) {
        // Not a SC2ML mod (no boot.json) or invalid mod; skip silently with a warning.
        console.warn(`sc2ml-compact: skip mod "${mod.name}" (${(e as Error).message})`);
      }
    }
    return result;
  }

  /**
   * Update {@link conflictResult} via a dry-run simulate merge of all mods.
   */
  private updateConflictResult(mods: ModInfo[]) {
    if (mods.length === 0) {
      this.conflictResult = [];
      return;
    }
    const origin = this.getSC2DataInfoCache();
    this.conflictResult = simulateMergeSC2DataInfoCache(origin, ...mods.map(m => m.cache));
  }

  /**
   * Merge mod data over the origin snapshot (scripts/styles replace, passages replace),
   * apply every mod's replace patches, and build the virtual passage table.
   */
  private buildMergedData(mods: ModInfo[]) {
    const origin = this.getSC2DataInfoCache();

    const em = normalMergeSC2DataInfoCache(
      new SC2DataInfo('EmptyMod'),
      ...mods.map(m => m.cache),
    );
    const merged = replaceMergeSC2DataInfoCache(origin.cloneSC2DataInfo(), em);

    for (const mod of mods) {
      for (const { fileName, patchInfo } of mod.replacePatchers) {
        new ReplacePatcher(mod.name, fileName, patchInfo).applyReplacePatcher(merged);
      }
    }

    this.cSC2DataInfoAfterPatchCache = merged;
    this.rebuildModPassageFromAfterPatch();
  }

  /**
   * Rebuild the virtual passage table from the after-patch cache: any passage whose
   * content differs from the origin snapshot (or that doesn't exist in origin) is
   * served by the middleware; untouched origin passages pass through.
   */
  private rebuildModPassageFromAfterPatch() {
    const origin = this.originSC2DataInfoCache;
    const merged = this.cSC2DataInfoAfterPatchCache;
    this.modPassageDataMap.clear();
    if (!merged) return;
    for (const item of merged.passageDataItems.items) {
      const originItem = origin?.passageDataItems.map.get(item.name);
      if (!originItem || originItem.content !== item.content) {
        this.modPassageDataMap.set(item.name, item.content);
      }
    }
  }

  /**
   * Register the single passage middleware that serves mod-provided passages to the engine.
   * Only fires for names contributed/patched by mods; origin passages pass through.
   */
  private registerPassageMiddleware() {
    if (this.passageMiddlewareRegistered) return;
    this.passageMiddlewareRegistered = true;

    window.YASCHook.passage.hook((context, next) => {
      const content = this.modPassageDataMap.get(context.name);
      if (content !== (void 0)) {
        context.text = content;
      }
      return next();
    });
  }

  /**
   * Rebuild merged data + conflict results from the current mod list (used after a
   * runtime lazy-register). Re-runs the merge/replace/conflict pipeline without
   * re-snapshotting the DOM or re-running scripts.
   */
  rebuildAll() {
    const mods = this.modLoader.getModCacheArray();
    this.updateConflictResult(mods);
    this.buildMergedData(mods);
    this.rebuildModPassageFromAfterPatch();
  }

  /**
   * Get `<tw-storydata>` node from HTML
   */
  get rootNode() {
    return document.querySelector<HTMLElement>('tw-storydata');
  }

  /**
   * Get all `<style>` nodes from story root node
   */
  get styleNode() {
    return this.rootNode ? this.rootNode.getElementsByTagName('style') : null;
  }

  /**
   * Get all `<script>` nodes from story root node
   */
  get scriptNode() {
    return this.rootNode ? this.rootNode.getElementsByTagName('script') : null;
  }

  /**
   * Get all `<tw-passagedata>` nodes from story root node
   */
  get passageDataNodeList() {
    return this.rootNode ? Array.from(this.rootNode.getElementsByTagName('tw-passagedata') as HTMLCollectionOf<HTMLElement>) : null;
  }
};
