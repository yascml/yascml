import JSON5 from 'json5';
import { clean as verClean, valid as verValid } from 'semver';
import type { ModMetaFile, ModAuthor } from '@yascml/loader';

export type ModNickName = ({ [key in string]?: string } & { cn?: string, en?: string }) | string | undefined;

export interface DependenceInfo {
  modName: string,
  version: string,
}

export interface ModBootJsonAddonPlugin {
  modName: string,
  addonName: string,
  modVersion: string,
  params?: any[] | { [key: string]: any },
}

export interface ModBootJson {
  name: string,
  nickName?: ModNickName,
  alias?: string[],
  version: string,
  styleFileList: string[],
  scriptFileList: string[],
  scriptFileList_preload?: string[],
  scriptFileList_earlyload?: string[],
  scriptFileList_inject_early?: string[],
  tweeFileList: string[],
  imgFileList: string[],
  replacePatchList?: string[],
  additionFile: string[],
  additionBinaryFile?: string[],
  addonPlugin?: ModBootJsonAddonPlugin[],
  dependenceInfo?: DependenceInfo[],
}

export const checkDependenceInfo = (v: any): v is DependenceInfo => (
  typeof v?.modName === 'string' && typeof v?.version === 'string'
);

const isStringArray = (v: any): v is string[] => Array.isArray(v) && v.every(e => typeof e === 'string');

export const validateBootJson = (bootJ: any): bootJ is ModBootJson => {
  let c = !!bootJ
    && typeof bootJ.name === 'string' && bootJ.name.length > 0
    && typeof bootJ.version === 'string' && bootJ.version.length > 0
    && isStringArray(bootJ.styleFileList)
    && isStringArray(bootJ.scriptFileList)
    && isStringArray(bootJ.tweeFileList)
    && isStringArray(bootJ.imgFileList);

  if (c && bootJ.nickName !== (void 0)) {
    c = typeof bootJ.nickName === 'string' || (typeof bootJ.nickName === 'object' && bootJ.nickName !== null);
  }
  if (c && bootJ.alias !== (void 0)) {
    c = isStringArray(bootJ.alias);
  }
  if (c && bootJ.dependenceInfo !== (void 0)) {
    c = Array.isArray(bootJ.dependenceInfo) && bootJ.dependenceInfo.every(checkDependenceInfo);
  }
  if (c && bootJ.addonPlugin !== (void 0)) {
    c = Array.isArray(bootJ.addonPlugin) && bootJ.addonPlugin.every((e: any) =>
      typeof e?.modName === 'string' && typeof e?.addonName === 'string' && typeof e?.modVersion === 'string'
    );
  }
  if (c && bootJ.replacePatchList !== (void 0)) {
    c = isStringArray(bootJ.replacePatchList);
  }
  if (c && bootJ.scriptFileList_preload !== (void 0)) {
    c = isStringArray(bootJ.scriptFileList_preload);
  }
  if (c && bootJ.scriptFileList_earlyload !== (void 0)) {
    c = isStringArray(bootJ.scriptFileList_earlyload);
  }
  if (c && bootJ.scriptFileList_inject_early !== (void 0)) {
    c = isStringArray(bootJ.scriptFileList_inject_early);
  }
  return c;
};

export const parseBootJson = (text: string): ModBootJson => {
  let parsed: any;
  try {
    parsed = JSON5.parse(text);
  } catch (e) {
    console.error(`Failed to parse boot.json: ${(e as Error).message}`);
    throw e;
  }
  if (!validateBootJson(parsed)) {
    console.error('Invalid boot.json: missing or invalid required fields');
    throw new Error('Invalid boot.json');
  }
  return parsed;
};

/** Normalize an arbitrary mod version string into a valid semver, or fall back to `0.0.0`. */
const normalizeVersion = (version: string): string => {
  const v = verValid(verClean(version) ?? version);
  return v ?? '0.0.0';
};

/** Derive a stable YASCML mod `id` from the SC2ML mod name. */
export const bootNameToId = (name: string): string => (
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sc2ml-mod'
);

/**
 * Convert a SC2ML `boot.json` into a YASCML `meta.json`.
 *
 * Only identity + ordering fields are emitted. SC2ML script lists / css / passages
 * are NOT mapped to `preloadScripts`/`postloadScripts`/`cssFiles` — those are handled
 * by sc2ml-compat itself at runtime to avoid double execution.
 */
export const bootJsonToMeta = (bootJ: ModBootJson): ModMetaFile => {
  const author: ModAuthor = { name: 'Unknown (SC2ML)' };

  const meta: ModMetaFile = {
    id: bootNameToId(bootJ.name),
    name: bootJ.name,
    author,
    version: normalizeVersion(bootJ.version),
  };

  meta.dependencies = {
    'sc2ml-compat': `^${__VERSION__}`,
  };

  if (bootJ.dependenceInfo && bootJ.dependenceInfo.length > 0) {
    for (const d of bootJ.dependenceInfo) {
      // Skip `GameVersion` since there's no such thing in YASCML
      if (d.modName === 'GameVersion') continue;

      // Skip `ModLoader` since we will add our own info
      if (d.modName === 'ModLoader') continue;

      // Keep as-is (SC2ML mod names); sc2ml-compat resolves these at runtime.
      meta.dependencies[d.modName] = d.version;
    }
  }

  return meta;
};
