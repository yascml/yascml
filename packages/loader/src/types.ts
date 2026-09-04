import JSZip from 'jszip';
import { ModList } from './class';
import { executeScript, loadStyle } from './utils';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  time: number,
  level: LogLevel,
  data: any[],
};

export type ModAuthor = string | {
  name: string,
  url?: string,
};

// TODO
export type ModMeta = {
  id: string,
  name: string,
  author: ModAuthor | ModAuthor[],
  version: string,
  priority?: number,
  dependencies?: Record<string, string>;
  designedFor?: string,
  icon?: string,
  homepageURL?: string,
  donateURL?: string,
};

export type ModMetaFile = ModMeta & {
  preloadScripts?: string[],
  postloadScripts?: string[],
  cssFiles?: string[],
};

export type ModMetaFull = Omit<ModMetaFile, 'designedFor'> & {
  designedFor?: string | RegExp,
  enabled: boolean,
  embedded: boolean,
  suitable: boolean,
  errored: boolean,
  new: boolean,
  updated: boolean,
  md5: string,
  zip?: JSZip,
};

export type ModFileMeta = {
  modId: string,
  filename: string,
  timing?: 'preload' | 'postload',
};

export type LoaderConfig = Partial<{
  embedModPath: string[],
  custom: Partial<{
    export: string[];
    init: { [name: string]: string };
  }>
  logInfo: boolean,
}>;

export type LoaderStats = {
  gameName: string,
  canLoadBlob: boolean,
  isLoaderInit: boolean,
  isEngineInit: boolean,
  logs: LogEntry[],
};

export type LoaderUtils = {
  executeScript: typeof executeScript,
  loadStyle: typeof loadStyle,
};

/**
 * A hook called before a mod file is imported (and persisted), allowing e.g.
 * `@yascml/sc2ml-compat` to pre-process SC2ML-format mods (boot.json) into
 * files that the loader can import directly. Return the (possibly rebuilt) file
 * to be imported and stored.
 */
export type ModImportPreprocess = (file: Blob) => Blob | Promise<Blob>;

export type YASCML = {
  version: string,
  mods: ModList, // TODO
  stats: LoaderStats,
  utils: LoaderUtils,
  importPreprocess?: ModImportPreprocess,
};
