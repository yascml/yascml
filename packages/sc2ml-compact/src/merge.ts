import { SC2DataInfo } from './class/dataInfo';

/**
 * Merge multiple {@link SC2DataInfo} into the first one. Scripts and styles are
 * concat-merged (same-name files are concatenated), passages are replace-merged
 * (same-name passages are overwritten).
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/MergeSC2DataInfoCache.ts
 */
export const normalMergeSC2DataInfoCache = (...ic: SC2DataInfo[]): SC2DataInfo => {
  if (ic.length === 0) throw new Error('normalMergeSC2DataInfoCache (ic.length === 0)');
  const ooo = ic[0];
  for (let i = 1; i < ic.length; i++) {
    ooo.scriptFileItems.concatMerge(ic[i].scriptFileItems);
    ooo.styleFileItems.concatMerge(ic[i].styleFileItems);
    ooo.passageDataItems.replaceMerge(ic[i].passageDataItems);
  }
  return ooo;
};

/**
 * Overlay multiple {@link SC2DataInfo} onto the first one. Same-name entries are
 * overwritten (replace-merge) across all three record kinds.
 */
export const replaceMergeSC2DataInfoCache = (...ic: SC2DataInfo[]): SC2DataInfo => {
  if (ic.length === 0) throw new Error('replaceMergeSC2DataInfoCache (ic.length === 0)');
  const ooo = ic[0];
  for (let i = 1; i < ic.length; i++) {
    ooo.scriptFileItems.replaceMerge(ic[i].scriptFileItems);
    ooo.styleFileItems.replaceMerge(ic[i].styleFileItems);
    ooo.passageDataItems.replaceMerge(ic[i].passageDataItems);
  }
  return ooo;
};

/**
 * Concat-merge multiple {@link SC2DataInfo} onto the first one (all three kinds).
 */
export const concatMergeSC2DataInfoCache = (...ic: SC2DataInfo[]): SC2DataInfo => {
  if (ic.length === 0) throw new Error('concatMergeSC2DataInfoCache (ic.length === 0)');
  const ooo = ic[0];
  for (let i = 1; i < ic.length; i++) {
    ooo.scriptFileItems.concatMerge(ic[i].scriptFileItems);
    ooo.styleFileItems.concatMerge(ic[i].styleFileItems);
    ooo.passageDataItems.concatMerge(ic[i].passageDataItems);
  }
  return ooo;
};
