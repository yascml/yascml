import { SC2DataInfo } from './class/dataInfo';
import { checkPatchInfo, PatchInfo, PatchInfoItem } from './mod/patchInfo';

/**
 * Escape a string so it can be used as a literal regex pattern.
 */
const escapedPatternString = (pattern: string): string => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceAndRecordPositions = (s: string, from: string, to: string) => {
  const positions: number[] = [];
  const r = s.replace(from, (_match, offset) => {
    positions.push(offset as number);
    return to;
  });
  return { r, positions };
};

export const tryReplaceStringFuzzyWithHint = (
  s: string,
  v: { from: string, to: string, pos: number },
  passageNameOrFileName: string,
): string => {
  // Fast path: constant match at ±0/±1/±2 offsets from the position hint.
  for (const delta of [ 0, -1, -2, 1, 2 ]) {
    const start = v.pos + delta;
    if (s.substring(start, start + v.from.length) === v.from) {
      return s.substring(0, start) + v.to + s.substring(start + v.from.length);
    }
  }

  // Fallback: fuzzy regex match within [-10, +30] of the hint.
  try {
    const re = new RegExp(escapedPatternString(v.from), '');
    const startPos = Math.max(0, v.pos - 10);
    const endPos = Math.min(s.length, v.pos + v.from.length + 30);
    const mm = re.exec(s.substring(startPos, endPos));
    if (mm) {
      const pStart = startPos + mm.index;
      const pEnd = pStart + v.from.length;
      return s.substring(0, pStart) + v.to + s.substring(pEnd);
    }
    console.warn(`tryReplaceStringFuzzyWithHint cannot find: [${v.from}] in [${passageNameOrFileName}] at [${v.pos}]`);
  } catch (e) {
    console.error(`tryReplaceStringFuzzyWithHint error: [${v.from}] in [${passageNameOrFileName}]: ${(e as Error).message}`);
  }
  return s;
};

/**
 * Applies `{ from, to }` string replacements to game data after merging.
 * Grouped by file name (js/css) or passage name (twee).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ReplacePatcher.ts
 */
export class ReplacePatcher {
  public patchInfo: PatchInfo;
  public patchInfoMap: {
    js: Map<string, PatchInfoItem[]>,
    css: Map<string, PatchInfoItem[]>,
    twee: Map<string, PatchInfoItem[]>,
  };

  constructor(
    public modName: string,
    public patchFileName: string,
    patchInfo_: any,
  ) {
    if (!checkPatchInfo(patchInfo_)) {
      console.error(`ReplacePatcher() invalid patchInfo [${modName}] [${patchFileName}]`);
      this.patchInfo = {};
    } else {
      this.patchInfo = patchInfo_;
    }

    this.patchInfoMap = { js: new Map(), css: new Map(), twee: new Map() };
    for (const [ key, map ] of [
      [ 'js', this.patchInfoMap.js ],
      [ 'css', this.patchInfoMap.css ],
    ] as const) {
      for (const T of this.patchInfo[key] ?? []) {
        if (!map.has(T.fileName)) map.set(T.fileName, []);
        map.get(T.fileName)!.push(T);
      }
    }
    for (const T of this.patchInfo.twee ?? []) {
      if (!T.passageName) {
        console.error(`ReplacePatcher() invalid patchInfo.twee passageName [${modName}] [${patchFileName}]`);
        continue;
      }
      if (!this.patchInfoMap.twee.has(T.passageName)) this.patchInfoMap.twee.set(T.passageName, []);
      this.patchInfoMap.twee.get(T.passageName)!.push(T);
    }
  }

  applyReplacePatcher(modSC2DataInfoCache: SC2DataInfo) {
    const applyList = (kind: 'js' | 'css', items: { name: string, content: string }[]) => {
      for (const item of items) {
        const patchInfoItems = this.patchInfoMap[kind].get(item.name);
        if (!patchInfoItems) continue;
        let s = item.content;
        for (const p of patchInfoItems) {
          const r = replaceAndRecordPositions(s, p.from, p.to);
          if (r.positions.length === 0) {
            console.warn(`applyReplacePatcher() ${kind} replace 0: in [${item.name}] of [${p.from}]`);
          } else if (r.positions.length > 1) {
            console.warn(`applyReplacePatcher() ${kind} replace multiple: in [${item.name}] of [${p.from}] at ${r.positions.join(',')}`);
          }
          s = r.r;
        }
        item.content = s;
      }
    };

    applyList('js', modSC2DataInfoCache.scriptFileItems.items);
    applyList('css', modSC2DataInfoCache.styleFileItems.items);

    for (const item of modSC2DataInfoCache.passageDataItems.items) {
      const patchInfoItems = this.patchInfoMap.twee.get(item.name);
      if (!patchInfoItems) continue;
      let s = item.content;
      for (const p of patchInfoItems) {
        const r = replaceAndRecordPositions(s, p.from, p.to);
        if (r.positions.length === 0) {
          console.warn(`applyReplacePatcher() twee replace 0: in [${item.name}] of [${p.from}]`);
        } else if (r.positions.length > 1) {
          console.warn(`applyReplacePatcher() twee replace multiple: in [${item.name}] of [${p.from}]`);
        }
        s = r.r;
      }
      item.content = s;
    }
  }
}
