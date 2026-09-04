import JSZip from 'jszip';
import type { ModBootJson } from '../mod/bootJson';
import type { ModInfo } from '../mod/modInfo';
import { parseModZip, BootJsonFilePath } from '../mod/modZip';

export type ModZipReleasedState = [boolean, boolean | null];

/**
 * Zip hash used as a stable mod-identity/cache key.
 *
 * The compat implementation reuses the YASCML loader's computed `mod.md5`
 * instead of computing an xxhash. Mods only use this as an opaque cache key
 * (`hash.toString()`), so any stable string works.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModZipReader.ts
 */
export class ModZipReaderHash {
  protected _hash?: string;

  constructor(hash?: string) {
    if (hash) {
      this._hash = hash;
    }
  }

  async init() {
    if (!this._hash) {
      throw new Error('[ModZipReaderHash] init() no hash available.');
    }
    return this._hash;
  }

  compare(h: ModZipReaderHash) {
    return this._hash === h._hash;
  }

  compareWithString(h: string) {
    return this._hash === h;
  }

  toString() {
    if (!this._hash) {
      throw new Error('[ModZipReaderHash] toString() this._hash is undefined.');
    }
    return this._hash;
  }

  fromString(_hash: string) {
    return this._hash;
  }
}

/**
 * Compatibility wrapper for the upstream `ModZipReader`.
 *
 * The compat implementation uses YASCML's already-loaded `JSZip` instance and
 * delegates SC2ML parsing to `parseModZip`. It intentionally does not implement
 * ModPack/encryption support.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModZipReader.ts
 */
export class SC2ModZip {
  static readonly modBootFilePath = BootJsonFilePath;

  private _zip?: JSZip;
  /** Parsed SC2ML metadata, exposed for upstream-compatible mod code. */
  public modInfo?: ModInfo;
  /** Stable zip hash, exposed for upstream-compatible mod code. */
  public modZipReaderHash: ModZipReaderHash;
  private released = false;

  constructor(zip: JSZip, modInfo?: ModInfo, hash?: string) {
    this._zip = zip;
    this.modInfo = modInfo;
    this.modZipReaderHash = new ModZipReaderHash(hash);
  }

  /** The wrapped zip, or throws after `gcReleaseZip()`. */
  get zip(): JSZip {
    if (!this._zip) {
      throw new Error(`SC2ModZip zip was released${this.modInfo ? ` [${this.modInfo.name}]` : ''}`);
    }
    return this._zip;
  }

  /** This compat wrapper only supports ordinary JSZip files. */
  get isModPack() {
    return false;
  }

  get isJsZip() {
    return true;
  }

  getModInfo() {
    return this.modInfo;
  }

  /** Upstream naming alias used by some SC2ML mods. */
  getModInfoRef() {
    return this.modInfo;
  }

  getZipFile() {
    return this._zip;
  }

  /**
   * Parse `boot.json` and construct the complete compat `ModInfo`.
   * Repeated calls return the existing parsed value.
   */
  async init(): Promise<boolean> {
    if (this.modInfo) return true;
    if (!this._zip) return false;

    try {
      this.modInfo = await parseModZip(this._zip);
      return true;
    } catch (e) {
      console.error(`SC2ModZip.init() failed: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Return the parsed mod, initializing the wrapper when necessary.
   * This is a compat convenience API; upstream callers can continue using
   * `init()` followed by `getModInfo()`.
   */
  async load(): Promise<ModInfo | undefined> {
    return await this.init() ? this.modInfo : (void 0);
  }

  /** Validate a parsed SC2ML boot object. */
  static validateBootJson(bootJson: unknown): bootJson is ModBootJson {
    if (!bootJson || typeof bootJson !== 'object') return false;
    const value = bootJson as Partial<ModBootJson>;
    const stringArray = (items: unknown): items is string[] => (
      Array.isArray(items) && items.every(item => typeof item === 'string')
    );
    return (
      typeof value.name === 'string' && value.name.length > 0 &&
      typeof value.version === 'string' && value.version.length > 0 &&
      stringArray(value.styleFileList) &&
      stringArray(value.scriptFileList) &&
      stringArray(value.tweeFileList) &&
      stringArray(value.imgFileList)
    );
  }

  /** Release the strong zip reference, matching upstream lifecycle helpers. */
  gcReleaseZip() {
    if (!this._zip) return;
    this._zip = (void 0);
    this.released = true;
  }

  gcCheckReleased(): ModZipReleasedState {
    return [ !!this._zip, this.released ? true : false ];
  }

  gcIsReleased() {
    return this._zip === (void 0);
  }
}
