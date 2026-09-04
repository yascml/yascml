import { satisfies as semverSatisfies, clean as semverClean } from 'semver';

/**
 * Infinite-arity SemVer compatibility layer for SC2ML mods.
 *
 * Keeps the upstream `InfiniteSemVer`-style API shape (`parseVersion(x).version`
 * is a `number[]`, `parseRange`/`satisfies` are range tools) so mods written
 * against `sugarcube-2-ModLoader` keep working, but delegates normal 3-part
 * ranges to the well-tested `semver` package. Arbitrarily long versions
 * (e.g. `1.2.3.4`) fall back to a compact numeric comparison.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/SemVer/InfiniteSemVer.ts
 */

export type InfiniteSemVer = {
  version: number[],
  preRelease?: string | undefined,
  buildMetadata?: string | undefined,
};

export type VersionBoundary = {
  version: InfiniteSemVer,
  operator: '>=' | '<=' | '>' | '<' | '=' | '^' | undefined,
};

/** Parsed version + optional leading range operator (e.g. `^1.2.3`). */
export type ParsedVersion = { version: InfiniteSemVer, operator?: VersionBoundary['operator'] };

const isNil = (v: unknown): v is null | undefined => v === null || v === (void 0);

const BoundaryOperators = [ '>=', '<=', '>', '<', '=', '^' ] as const;

/**
 * Parse `1.2.3`, `1.2.3.4`, `1.2.3-alpha`, `1.2.3+meta` and optional leading
 * operators into the upstream-compatible shape.
 */
export const parseVersion = (versionStr: string): ParsedVersion => {
  versionStr = (versionStr ?? '').trim();
  let operator: VersionBoundary['operator'];

  for (const op of BoundaryOperators) {
    if (versionStr.startsWith(op)) {
      operator = op;
      versionStr = versionStr.slice(op.length).trim();
      break;
    }
  }

  const version: number[] = [];
  let preRelease: string | undefined;
  let buildMetadata: string | undefined;

  let sp1 = versionStr.indexOf('-');
  sp1 = sp1 === -1 ? versionStr.length : sp1;
  let sp2 = versionStr.indexOf('+');
  sp2 = sp2 === -1 ? versionStr.length : sp2;
  const sp = Math.min(sp1, sp2);

  for (const part of versionStr.slice(0, sp).split('.')) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0) break;
    version.push(num);
  }
  if (version.length === 0) version.push(0);

  if (sp1 < sp2 && sp1 < versionStr.length) preRelease = versionStr.slice(sp1 + 1, sp2);
  if (sp2 < versionStr.length) buildMetadata = versionStr.slice(sp2 + 1);

  return { version: { version, preRelease, buildMetadata }, operator };
};

/** Rebuild a version string from the parsed shape (used for npm semver). */
export const toVersionString = (v: InfiniteSemVer, ignorePostfix = false): string => {
  const core = v.version.length > 0 ? v.version.join('.') : '0';
  if (ignorePostfix) return core;
  return core + (v.preRelease ? `-${v.preRelease}` : '');
};

/**
 * Compare two numeric versions (any arity), padding missing parts with 0.
 * Returns negative / 0 / positive.
 */
export const compareInfiniteVersions = (a: InfiniteSemVer, b: InfiniteSemVer, ignorePostfix = false): number => {
  const maxLength = Math.max(a.version.length, b.version.length);
  for (let i = 0; i < maxLength; i++) {
    const aValue = i < a.version.length ? a.version[i] : 0;
    const bValue = i < b.version.length ? b.version[i] : 0;
    if (aValue !== bValue) return aValue - bValue;
  }
  if (ignorePostfix) return 0;
  if (a.preRelease && b.preRelease) return a.preRelease.localeCompare(b.preRelease);
  if (a.preRelease && isNil(b.preRelease)) return -1;
  if (isNil(a.preRelease) && b.preRelease) return 1;
  return 0;
};

/**
 * Normalize a range string into an npm-semver-friendly form. SC2ML's `&&` is
 * translated to the space-separated AND that npm expects.
 */
export const parseRange = (rangeStr: string): string => {
  return (rangeStr ?? '').trim().replace(/\s*&&\s*/g, ' ');
};

const hasNonNpmParts = (versionStr: string): boolean => {
  // npm semver only handles up to 3 numeric parts; detect longer versions.
  const core = versionStr.split(/[-+]/)[0];
  return core.split('.').length > 3;
};

/**
 * Compact numeric fallback for versions/ranges that npm semver can't parse
 * (e.g. 4-part versions like `1.2.3.4`). Supports `>`,`>=`,`<`,`<=`,`=`,`^`
 * and `||`-separated sets.
 */
const satisfiesNumeric = (v: InfiniteSemVer, rangeStr: string, ignorePostfix: boolean): boolean => {
  for (const setStr of rangeStr.split('||')) {
    const boundaries = setStr.split(' ').filter(Boolean);
    let inSet = true;
    for (const raw of boundaries) {
      const boundary = parseVersion(raw);
      const cmp = compareInfiniteVersions(v, boundary.version, ignorePostfix);
      const op = boundary.operator;
      if (op === '>') { if (cmp <= 0) inSet = false; }
      else if (op === '>=') { if (cmp < 0) inSet = false; }
      else if (op === '<') { if (cmp >= 0) inSet = false; }
      else if (op === '<=') { if (cmp > 0) inSet = false; }
      else if (op === '^') {
        const lower = compareInfiniteVersions(v, boundary.version, ignorePostfix) >= 0;
        let upper = true;
        if (boundary.version.version[0] === 0) {
          const c1 = boundary.version.version.length >= 2 ? boundary.version.version[1] + 1 : 1;
          upper = compareInfiniteVersions(v, { version: [ 0, c1 ] }, ignorePostfix) < 0;
        } else if (boundary.version.version[0] > 0) {
          upper = compareInfiniteVersions(v, { version: [ boundary.version.version[0] + 1 ] }, ignorePostfix) < 0;
        }
        if (!(lower && upper)) inSet = false;
      } else {
        // `=` / bare version
        if (compareInfiniteVersions(v, boundary.version, ignorePostfix) !== 0) inSet = false;
      }
    }
    if (inSet) return true;
  }
  return false;
};

/**
 * Test whether `v` satisfies `rangeStr`. Uses npm `semver` for ordinary 3-part
 * ranges, falling back to {@link satisfiesNumeric} for longer versions.
 */
export const satisfies = (v: InfiniteSemVer, rangeStr: string, ignorePostfix = false): boolean => {
  const versionStr = toVersionString(v, ignorePostfix);
  const normalizedRange = parseRange(rangeStr);

  // If neither side has >3 numeric parts, npm semver handles everything
  // (including `^`, `||`, pre-release).
  if (!hasNonNpmParts(versionStr) && !/\.\d+\.\d+\.\d+\.\d+/.test(normalizedRange)) {
    const cleaned = semverClean(versionStr);
    if (cleaned) {
      try {
        return semverSatisfies(cleaned, normalizedRange);
      } catch {
        // fall through to numeric
      }
    }
  }
  return satisfiesNumeric(v, normalizedRange, ignorePostfix);
};

export class SemVerToolsType {
  parseVersion = parseVersion;
  parseRange = parseRange;
  satisfies = satisfies;
}
