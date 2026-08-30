import { Logger } from '../types';
import { buildLogger } from '../utils';

const FilePathSliptReg = /[\\\/]{1,2}/;

/**
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L177
 */
export class CacheRecord<T extends { name: string, content: string }> {
  /**
   * Public logger, part of the SC2ML mod-facing data API.
   */
  readonly log: Logger = buildLogger();

  map: Map<string, T> = new Map();
  items: T[] = [];
  noName: T[] = [];
  noPathCache?: Map<string, string[]> = new Map();

  constructor(
    public dataSource: string,
    public cacheRecordName: string,
    public needBuildNoPathCache: boolean = false,
  ) {}

  /**
   * Build {@link items|CacheRecord.items}.
   * 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L114
   */
  back2Array() {
    this.items = Array.from(this.map.values()).concat(this.noName);
  }

  /**
   * Build {@link items|CacheRecord.noPathCache}.
   * 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L50
   */
  buildNoPathCache() {
    if (!this.needBuildNoPathCache) {
      return this.noPathCache = (void 0);
    }
    this.noPathCache = new Map();

    for (const k of this.map.keys()) {
      const n =this.getNoPathNameFromString(k);
      if (!this.noPathCache.has(n)) {
        this.noPathCache.set(n, [k]);
      } else {
        this.noPathCache.get(n)!.push(k);
      }
    }
  }

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L83
   */
  clean() {
    this.map.clear();
    this.items.length = 0;
    this.noName.length = 0;
    this.dataSource = '';
    this.cacheRecordName = '';
    this.buildNoPathCache();
  }

  /**
   * Merge data from another {@link CacheRecord}.
   * 
   * @param {CacheRecord} c - Another {@link CacheRecord}
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L147
   */
  concatMerge(c: CacheRecord<T>) {
    for (const item of c.items) {
      if (this.map.has(item.name)) {
        const n = this.map.get(item.name)!;
        n.content = n.content + '\n' + item.content;
      } else {
        this.map.set(item.name, item);
      }
    }
    this.noName = this.noName.concat(c.noName);
    this.items = Array.from(this.map.values()).concat(this.noName);
    this.buildNoPathCache();
  }

  /**
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L73
   */
  destroy() {
    this.map.clear();
    this.items.length = 0;
    this.noName.length = 0;
    if (this.noPathCache) {
      this.noPathCache.clear();
      this.noPathCache = (void 0);
    }
    this.dataSource = '';
    this.cacheRecordName = '';
  }

  /**
   * Build {@link map|CacheRecord.map}.
   * 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L94
   */
  fillMap() {
    this.map.clear();
    this.noName.length = 0;

    for (const item of this.items) {
      if (item.name) {
        this.map.set(item.name, item);
      } else {
        this.noName.push(item);
      }
    }
    this.buildNoPathCache();
  }

  /**
   * Get file content by file name only.
   * 
   * @param {string} s - File name
   * @returns {T | undefined} File content
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L161
   */
  getByNameWithNoPath(s: string): T | undefined {
    const orgS = this.noPathCache?.get(s) ?? [s];
    return this.map.get(orgS[0]);
  }

  /**
   * Get file content by file path or file name.
   * 
   * @param {string} s - File path or file name.
   * @returns {T | undefined} File content
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L166
   */
  getByNameWithOrWithoutPath(s: string): T | undefined {
    const o = this.map.get(s);
    if (o) return o;
    return this.getByNameWithNoPath(s);
  }

  /**
   * Get file name from path.
   * 
   * @param {string} s - Raw path string 
   * @returns {string} File name
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L39
   */
  getNoPathNameFromString(s: string) {
    const path = s.split(FilePathSliptReg);
    if (path.length < 2) return s;
    return path[path.length - 1];
  }

  /**
   * Replace data from another {@link CacheRecord}
   * 
   * @param {CacheRecord} c - Another {@link CacheRecord}
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L121
   */
  replaceMerge(c: CacheRecord<T>) {
    for (const item of c.items) {
      this.map.set(item.name, item);
    }
    this.noName = this.noName.concat(c.noName);
    this.items = Array.from(this.map.values()).concat(this.noName);
    this.buildNoPathCache();
  }
}
