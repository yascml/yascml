import JSZip from 'jszip';
import { BootJsonFilePath, buildCacheData, parseModZip, Sc2mlCacheFilePath, Sc2mlMetaFilePath } from './modZip';
import { bootJsonToMeta } from './bootJson';

/**
 * Pre-process a mod file before import (registered as `YASCML.importPreprocess`).
 *
 * - Already-YASCML mods (has `meta.json`) → returned unchanged.
 * - SC2ML mods (has `boot.json`, no `meta.json`) → fully parsed, then rebuilt with a
 *   synthesized `meta.json` (so the loader accepts it) and an embedded
 *   `yascml-sc2data.json` pre-parse cache (so load time skips re-parsing).
 * - Anything else → returned unchanged (the loader will report the usual error).
 */
export const importPreprocess = async (file: Blob): Promise<Blob> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e) {
    console.warn(`importPreprocess: not a valid zip, skipping: ${(e as Error).message}`);
    return file;
  }

  if (zip.file(Sc2mlMetaFilePath)) {
    // Already YASCML-compatible; leave untouched.
    return file;
  }

  const bootText = await (async () => {
    const f = zip.file(BootJsonFilePath);
    return f ? f.async('string') : (void 0);
  })();
  if (bootText === (void 0)) {
    // Not a SC2ML mod either; let the loader report the missing meta.json.
    return file;
  }

  const mod = await parseModZip(zip);
  const meta = bootJsonToMeta(mod.bootJson);

  // Preserve the original boot.json, add the synthesized meta.json and the pre-parse cache.
  zip.file(Sc2mlMetaFilePath, JSON.stringify(meta, null, 2));
  zip.file(Sc2mlCacheFilePath, JSON.stringify(buildCacheData(mod), null, 2));

  return zip.generateAsync({ type: 'blob' });
};

/** Register the pre-process hook onto the loader's `YASCML` global. */
export const registerImportPreprocess = () => {
  if (window.YASCML) {
    window.YASCML.importPreprocess = importPreprocess;
  }
};
