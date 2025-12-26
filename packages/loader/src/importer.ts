import JSZip from 'jszip';
import { isValidModMeta, getFileMD5 } from './utils';
import { ModMetaFile, ModMetaFull } from './types';

const RegExpMatchReg = /^\/(\\\/|[^\/]+)\/([gimsuy]*)$/;

export const importModFromFile = async (modZip: Blob, exposeZip: boolean) => {
  const zip = await JSZip.loadAsync(modZip);
  if (!zip.file('meta.json'))
    throw new Error('"meta.json" not found in mod file, is this a valid mod file?');

  const modMetaString = await (zip.file('meta.json')!).async('text');
  const modMeta = JSON.parse(modMetaString) as ModMetaFile;
  if (!isValidModMeta(modMeta))
    throw new Error('Invalid format of "meta.json"');

  const result: ModMetaFull = {
    ...modMeta,
    enabled: true,
    embedded: false,
    suitable: true,
    errored: false,
    new: false,
    updated: false,
    deleted: false,
    md5: '',
  };
  if (exposeZip) result.zip = zip;

  try {
    result.md5 = await getFileMD5(modZip);
  } catch (e) {
    console.warn(`Failed to get MD5 for mod: ${result.id}, using empty string`);
    console.error(e);
  }

  if (result.designedFor !== (void 0)) {
    if (RegExpMatchReg.test(result.designedFor as string)) {
      const [, regExp, regExpFlags ] = RegExpMatchReg.exec(result.designedFor as string)!;
      result.designedFor = new RegExp(regExp, regExpFlags || '');
    }
  }

  return result;
};

export const importModFromUrl = (url: string, exposeZip: boolean) => (
  fetch(url)
    .then(e => e.blob())
    .then(e => importModFromFile(e, exposeZip))
);

export const importMod = (file: string | Blob, exposeZip = false) => {
  if (typeof file === 'string') return importModFromUrl(file, exposeZip);
  return importModFromFile(file, exposeZip);
};
