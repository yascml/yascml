import type { SC2DataInfo } from '../class/dataInfo';
import type { ModBootJson, ModNickName } from './bootJson';
import type { PatchInfo } from './patchInfo';

/**
 * A parsed SC2ML mod, mirroring the upstream `ModInfo`.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModLoader.ts
 */
export interface ModInfo {
  name: string,
  nickName?: ModNickName,
  alias: string[],
  version: string,
  bootJson: ModBootJson,
  /**
   * Merged game data contributed by this mod (style/script/passage items).
   */
  cache: SC2DataInfo,
  /**
   * Executable script contents: [fileName, content].
   */
  scriptFileList_preload: [string, string][],
  scriptFileList_earlyload: [string, string][],
  scriptFileList_inject_early: [string, string][],
  /**
   * Parsed replace patches.
   */
  replacePatchers: { fileName: string, patchInfo: PatchInfo }[],
  imgFileList: string[],
}

/**
 * Version of the pre-parse cache schema. Bump when the parse logic changes so
 * stale caches are invalidated and re-parsed.
 */
export const SC2ML_CACHE_FORMAT_VERSION = 1;

export type Sc2mlCacheData = {
  formatVersion: number,
  mod: {
    name: string,
    nickName?: ModNickName,
    alias: string[],
    version: string,
  },
  data: {
    styleFileItems: { id: number, name: string, content: string }[],
    scriptFileItems: { id: number, name: string, content: string }[],
    passageDataItems: { id: number, name: string, tags: string[], content: string, position?: string, size?: string }[],
  },
  replacePatchers: { fileName: string, patchInfo: PatchInfo }[],
  /**
   * Executable script paths only; contents are read from the zip at execution time.
   */
  scriptFileList_preload: string[],
  scriptFileList_earlyload: string[],
  scriptFileList_inject_early: string[],
  imgFileList: string[],
  bootJson: ModBootJson,
};
