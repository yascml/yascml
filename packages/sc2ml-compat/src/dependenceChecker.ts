import { ModInfo } from './mod/modInfo';
import { parseRange, parseVersion, satisfies } from './semver';

/**
 * The SC2ML-compatible ModLoader version reported to mods via `modUtils.version`
 * and used to satisfy `dependenceInfo` entries that require `ModLoader`.
 */
export const ModLoaderCompatVersion = '2.101.1';

/**
 * Check dependencies of one mod against an already-loaded mod list (incremental).
 *
 * `GameVersion` and `ModLoader` pseudo-dependencies are handled specially;
 * `GameVersion` can only be checked post-load via {@link checkGameVersion}.
 *
 * @param mod The mod whose dependencies to check.
 * @param loaded Ordered mods already loaded (dependency must appear earlier).
 * @returns true if all dependencies are satisfied.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/DependenceChecker.ts
 */
export const checkFor = (mod: ModInfo, loaded: ModInfo[]): boolean => {
  if (!mod.bootJson.dependenceInfo) return true;

  let isOk = true;
  for (const d of mod.bootJson.dependenceInfo) {
    if (d.modName === 'GameVersion') {
      // Only checkable once the game reports its version.
      continue;
    }
    if (d.modName === 'ModLoader') {
      if (!satisfies(parseVersion(ModLoaderCompatVersion).version, parseRange(d.version))) {
        console.error(`DependenceChecker.checkFor(${mod.name}) not satisfies ModLoader: mod[${mod.name}] need mod[${d.modName}] version[${d.version}] but find ModLoader[${ModLoaderCompatVersion}].`);
        isOk = false;
      }
      continue;
    }

    const mod2 = loaded.find(m => m.name === d.modName || m.alias.includes(d.modName));
    if (!mod2) {
      console.error(`DependenceChecker.checkFor(${mod.name}) not found mod: mod[${mod.name}] need mod[${d.modName}] but not find.`);
      isOk = false;
      continue;
    }
    if (!satisfies(parseVersion(mod2.version).version, parseRange(d.version))) {
      console.error(`DependenceChecker.checkFor(${mod.name}) not satisfies: mod[${mod.name}] need mod[${d.modName}] version[${d.version}] but find version[${mod2.version}].`);
      isOk = false;
    }
  }
  return isOk;
};

/**
 * Validate dependencies across the final mod order: each dependency must exist and
 * be loaded before the depending mod.
 *
 * @param modOrder Ordered mods.
 * @returns true if all dependencies are satisfied.
 */
export const check = (modOrder: ModInfo[]): boolean => {
  let allOk = true;

  for (let i = 0; i !== modOrder.length; ++i) {
    const mod = modOrder[i];
    if (!mod.bootJson.dependenceInfo) continue;

    for (const d of mod.bootJson.dependenceInfo) {
      if (d.modName === 'GameVersion') continue;
      if (d.modName === 'ModLoader') {
        if (!satisfies(parseVersion(ModLoaderCompatVersion).version, parseRange(d.version))) {
          console.error(`DependenceChecker.check() not satisfies ModLoader: mod[${mod.name}] need mod[${d.modName}] version[${d.version}] but find ModLoader[${ModLoaderCompatVersion}].`);
          allOk = false;
        }
        continue;
      }

      const depIndex = modOrder.findIndex(m => m.name === d.modName || m.alias.includes(d.modName));
      if (depIndex === -1) {
        console.error(`DependenceChecker.check() not found mod: mod[${mod.name}] need mod[${d.modName}] but not find.`);
        allOk = false;
        continue;
      }
      const mod2 = modOrder[depIndex];
      if (!satisfies(parseVersion(mod2.version).version, parseRange(d.version))) {
        console.error(`DependenceChecker.check() not satisfies: mod[${mod.name}] need mod[${d.modName}] version[${d.version}] but find version[${mod2.version}].`);
        allOk = false;
        continue;
      }
      if (depIndex >= i) {
        console.error(`DependenceChecker.check() not satisfies order: mod[${mod.name}] need mod[${d.modName}] load before it.`);
        allOk = false;
      }
    }
  }
  return allOk;
};

/**
 * Check `GameVersion` pseudo-dependencies once the game has reported its version.
 * Called post-load (e.g. by a `CheckGameVersion`-style mod).
 *
 * @param gameVersion Reported game version.
 * @param modOrder Loaded mods.
 * @returns true if all game-version dependencies are satisfied.
 */
export const checkGameVersion = (gameVersion: string, modOrder: ModInfo[]): boolean => {
  let allOk = true;
  for (const mod of modOrder) {
    if (!mod.bootJson.dependenceInfo) continue;
    const n = mod.bootJson.dependenceInfo.find(T => T.modName === 'GameVersion');
    if (!n) continue;

    if (!satisfies(parseVersion(gameVersion).version, parseRange(n.version), true)) {
      console.error(`DependenceChecker.checkGameVersion() not satisfies: mod[${mod.name}] need gameVersion[${n.version}] but gameVersion is [${gameVersion}].`);
      allOk = false;
    }
  }
  return allOk;
};
