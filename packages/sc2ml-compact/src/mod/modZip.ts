import JSZip from 'jszip';
import { SC2DataInfo } from '../class/dataInfo';
import { Twee2Passage } from '../twee';
import { parseBootJson } from './bootJson';
import { checkPatchInfo, PatchInfo } from './patchInfo';
import { ModInfo, SC2ML_CACHE_FORMAT_VERSION, Sc2mlCacheData } from './modInfo';
import { buildModImgs } from './modImg';

export const BootJsonFilePath = 'boot.json';
export const Sc2mlCacheFilePath = 'yascml-sc2data.json';
export const Sc2mlMetaFilePath = 'meta.json';

/**
 * Read a file's text content from the zip, or `undefined` if missing.
 */
const readZipText = async (zip: JSZip, path: string): Promise<string | undefined> => {
  const f = zip.file(path);
  if (!f) return (void 0);
  return f.async('string');
};

/**
 * Read all files in `list` as `[path, content]` pairs, skipping missing files (with a warning).
 */
const readFileList = async (zip: JSZip, list: string[]): Promise<[string, string][]> => {
  const out: [string, string][] = [];
  for (const p of list) {
    const content = await readZipText(zip, p);
    if (content === (void 0)) {
      console.warn(`Cannot find file in mod zip: "${p}"`);
      continue;
    }
    out.push([p, content]);
  }
  return out;
};

/**
 * Fully parse a SC2ML mod zip (load-time fallback path, and the basis for pre-parse).
 */
export const parseModZip = async (zip: JSZip): Promise<ModInfo> => {
  const bootText = await readZipText(zip, BootJsonFilePath);
  if (bootText === (void 0)) {
    throw new Error('"boot.json" not found in mod zip, not a SC2ML mod');
  }

  const bootJson = parseBootJson(bootText);

  const cache = new SC2DataInfo('mod');

  // style files
  for (const p of bootJson.styleFileList || []) {
    const content = await readZipText(zip, p);
    if (content === (void 0)) { console.warn(`Cannot find styleFileList file: "${p}"`); continue; }
    cache.styleFileItems.items.push({ id: 0, name: p, content });
  }
  cache.styleFileItems.fillMap();

  // script files (user scripts that flow into tw-storydata)
  for (const p of bootJson.scriptFileList || []) {
    const content = await readZipText(zip, p);
    if (content === (void 0)) { console.warn(`Cannot find scriptFileList file: "${p}"`); continue; }
    cache.scriptFileItems.items.push({ id: 0, name: p, content });
  }
  cache.scriptFileItems.fillMap();

  // twee files -> passages
  for (const p of bootJson.tweeFileList || []) {
    const content = await readZipText(zip, p);
    if (content === (void 0)) { console.warn(`Cannot find tweeFileList file: "${p}"`); continue; }
    for (const passage of Twee2Passage(content)) {
      cache.passageDataItems.items.push({
        id: 0,
        name: passage.name,
        tags: passage.tags,
        content: passage.content,
      });
    }
  }
  cache.passageDataItems.fillMap();

  // replace patches
  const replacePatchers: { fileName: string, patchInfo: PatchInfo }[] = [];
  for (const p of bootJson.replacePatchList || []) {
    const content = await readZipText(zip, p);
    if (content === (void 0)) { console.warn(`Cannot find replacePatchList file: "${p}"`); continue; }
    let patchInfo: any;
    try {
      patchInfo = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse replace patch file: "${p}" (${(e as Error).message})`);
      continue;
    }
    if (!checkPatchInfo(patchInfo)) {
      console.error(`Invalid replace patch file: "${p}"`);
      continue;
    }
    replacePatchers.push({ fileName: p, patchInfo });
  }

  return {
    name: bootJson.name,
    nickName: bootJson.nickName,
    alias: bootJson.alias ?? [],
    version: bootJson.version,
    bootJson,
    cache,
    scriptFileList_preload: await readFileList(zip, bootJson.scriptFileList_preload ?? []),
    scriptFileList_earlyload: await readFileList(zip, bootJson.scriptFileList_earlyload ?? []),
    scriptFileList_inject_early: await readFileList(zip, bootJson.scriptFileList_inject_early ?? []),
    replacePatchers,
    imgFileList: bootJson.imgFileList ?? [],
    imgs: buildModImgs(bootJson.name, zip, bootJson.imgFileList ?? []),
  };
};

/** Serialize a parsed {@link ModInfo} into the pre-parse cache format. */
export const buildCacheData = (mod: ModInfo): Sc2mlCacheData => ({
  formatVersion: SC2ML_CACHE_FORMAT_VERSION,
  mod: {
    name: mod.name,
    nickName: mod.nickName,
    alias: mod.alias,
    version: mod.version,
  },
  data: {
    styleFileItems: mod.cache.styleFileItems.items.map(e => ({ ...e })),
    scriptFileItems: mod.cache.scriptFileItems.items.map(e => ({ ...e })),
    passageDataItems: mod.cache.passageDataItems.items.map(e => ({ ...e })),
  },
  replacePatchers: mod.replacePatchers,
  scriptFileList_preload: mod.scriptFileList_preload.map(([p]) => p),
  scriptFileList_earlyload: mod.scriptFileList_earlyload.map(([p]) => p),
  scriptFileList_inject_early: mod.scriptFileList_inject_early.map(([p]) => p),
  imgFileList: mod.imgFileList,
  bootJson: mod.bootJson,
});

/**
 * Restore a {@link ModInfo} from a pre-parse cache. Executable script contents are
 * re-read from the zip (only paths are cached). Returns `null` if the cache is missing
 * or its format version is stale (caller should fall back to {@link parseModZip}).
 */
export const buildModInfoFromCache = async (
  zip: JSZip,
  cache: Sc2mlCacheData | null,
): Promise<ModInfo | null> => {
  if (!cache || cache.formatVersion !== SC2ML_CACHE_FORMAT_VERSION) return null;

  const sc2 = new SC2DataInfo('mod');
  sc2.styleFileItems.items = cache.data.styleFileItems;
  sc2.styleFileItems.fillMap();
  sc2.scriptFileItems.items = cache.data.scriptFileItems;
  sc2.scriptFileItems.fillMap();
  sc2.passageDataItems.items = cache.data.passageDataItems;
  sc2.passageDataItems.fillMap();

  return {
    name: cache.mod.name,
    nickName: cache.mod.nickName,
    alias: cache.mod.alias,
    version: cache.mod.version,
    bootJson: cache.bootJson,
    cache: sc2,
    scriptFileList_preload: await readFileList(zip, cache.scriptFileList_preload),
    scriptFileList_earlyload: await readFileList(zip, cache.scriptFileList_earlyload),
    scriptFileList_inject_early: await readFileList(zip, cache.scriptFileList_inject_early),
    replacePatchers: cache.replacePatchers,
    imgFileList: cache.imgFileList,
    imgs: buildModImgs(cache.mod.name, zip, cache.imgFileList),
  };
};
