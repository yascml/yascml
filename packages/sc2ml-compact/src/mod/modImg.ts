import type JSZip from 'jszip';
import type { ModImg, ModImgGetter } from './modInfo';

const extToMime: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

const getMime = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return extToMime[ext] ?? 'application/octet-stream';
};

/**
 * Lazily reads a mod image from its zip and exposes it as a base64 data URL.
 * Mirrors upstream `ModImgGetterDefault` (used by mods to pre-cache images
 * before releasing the zip).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModLoader.ts
 */
export class CompactModImgGetter implements ModImgGetter {
  invalid = false;
  private imgCache?: string;

  constructor(
    public modName: string,
    public zip: JSZip,
    public imgPath: string,
  ) {}

  async forceCache() {
    this.imgCache = await this.getBase64Image();
    return this.imgCache;
  }

  async getBase64Image(): Promise<string | undefined> {
    if (this.invalid) return undefined;
    if (this.imgCache) return this.imgCache;

    try {
      const imgFile = this.zip.file(this.imgPath);
      if (!imgFile) {
        console.warn(`CompactModImgGetter: img file not found: ${this.imgPath} in ${this.modName}`);
        this.invalid = true;
        return undefined;
      }
      const base64 = await imgFile.async('base64');
      this.imgCache = `data:${getMime(this.imgPath)};base64,${base64}`;
      return this.imgCache;
    } catch (e) {
      console.error(`CompactModImgGetter: failed to read ${this.imgPath} in ${this.modName}`, e);
      this.invalid = true;
      return undefined;
    }
  }
}

export const buildModImgs = (modName: string, zip: JSZip, imgFileList: string[]): ModImg[] => (
  imgFileList.map(path => ({
    path,
    getter: new CompactModImgGetter(modName, zip, path),
  }))
);
