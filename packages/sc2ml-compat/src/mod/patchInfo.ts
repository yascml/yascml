import { isArray, isString, every } from 'lodash';

export interface PatchInfoItem {
  from: string,
  to: string,
  fileName: string,
  passageName?: string,
}

export interface PatchInfo {
  js?: PatchInfoItem[],
  css?: PatchInfoItem[],
  twee?: PatchInfoItem[],
}

export const checkPatchInfoItem = (o: any): o is PatchInfoItem => (
  !!o && isString(o.from) && isString(o.to) && isString(o.fileName)
);

export const checkPatchInfoItemPassage = (o: any): o is PatchInfoItem => (
  !!o && isString(o.from) && isString(o.to) && isString(o.passageName)
);

export const checkPatchInfo = (o: any): o is PatchInfo => (
  !!o
  && (o.js ? (isArray(o.js) && every(o.js, checkPatchInfoItem)) : true)
  && (o.css ? (isArray(o.css) && every(o.css, checkPatchInfoItem)) : true)
  && (o.twee ? (isArray(o.twee) && every(o.twee, checkPatchInfoItemPassage)) : true)
);
