import { cloneDeep } from 'lodash';
import { SC2DataInfo } from './class/dataInfo';

export interface SimulateMergeResultItem {
  ok: Set<string>,
  conflict: Set<string>,
}

export interface SimulateMergeResult {
  styleFileItems: SimulateMergeResultItem,
  scriptFileItems: SimulateMergeResultItem,
  passageDataItems: SimulateMergeResultItem,
  dataSource: string,
}

/**
 * Merge `b` into `a` (both name-sets). Items already claimed by `a` become conflicts;
 * new items are added to `a` (which is mutated in place).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/SimulateMerge.ts
 */
export const simulateMergeStep = (a: Set<string>, b: Set<string>): SimulateMergeResultItem => {
  const r: SimulateMergeResultItem = { ok: a, conflict: new Set<string>() };

  for (const item of b) {
    if (r.ok.has(item)) {
      r.conflict.add(item);
    } else {
      r.ok.add(item);
    }
  }

  return r;
};

/**
 * Dry-run merge of multiple {@link SC2DataInfo}, returning per-mod conflict results
 * (name-sets that a later mod would overwrite on an earlier mod).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/SimulateMerge.ts
 */
export const simulateMergeSC2DataInfoCache = (...ic: SC2DataInfo[]): SimulateMergeResult[] => {
  if (ic.length === 0) {
    throw new Error('simulateMergeSC2DataInfoCache (ic.length === 0)');
  }

  const ooo = ic[0];
  const createResult = (c: SC2DataInfo): SimulateMergeResult => ({
    styleFileItems: { ok: new Set<string>(c.styleFileItems.map.keys()), conflict: new Set<string>() },
    scriptFileItems: { ok: new Set<string>(c.scriptFileItems.map.keys()), conflict: new Set<string>() },
    passageDataItems: { ok: new Set<string>(c.passageDataItems.map.keys()), conflict: new Set<string>() },
    dataSource: c.dataSource,
  });

  const temp: Omit<SimulateMergeResult, 'dataSource'> = createResult(ooo);
  const r: SimulateMergeResult[] = [];

  for (let i = 1; i < ic.length; i++) {
    const c = ic[i];
    const t = createResult(c);
    t.styleFileItems = simulateMergeStep(temp.styleFileItems.ok, t.styleFileItems.ok);
    t.scriptFileItems = simulateMergeStep(temp.scriptFileItems.ok, t.scriptFileItems.ok);
    t.passageDataItems = simulateMergeStep(temp.passageDataItems.ok, t.passageDataItems.ok);
    r.push(cloneDeep(t));
  }

  return r;
};
