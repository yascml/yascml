import JSZip from 'jszip';
import api from './api';

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
  deleted: boolean,
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

export type YASCML = {
  version: string,
  mods: ModMetaFull[], // TODO
  api: typeof api,
  stats: LoaderStats,
};
