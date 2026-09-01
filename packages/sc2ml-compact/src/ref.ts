import * as idb from 'idb';
import * as idbKeyval from 'idb-keyval';

export interface IdbRef {
  idb_openDB: typeof idb.openDB,
  idb_deleteDB: typeof idb.deleteDB,
}

export interface IdbKeyvalRef {
  keyval_get: typeof idbKeyval.get,
  keyval_set: typeof idbKeyval.set,
  keyval_del: typeof idbKeyval.del,
  createStore: typeof idbKeyval.createStore,
  setMany: typeof idbKeyval.setMany,
}

// Reuse the globals the loader already installs (window.idbKeyval) when present,
// otherwise fall back to the bundled module instances. Cached so callers don't
// rebuild the ref object on every call.
let idbKeyvalRef: IdbKeyvalRef | undefined;
let idbRef: IdbRef | undefined;

export const buildIdbRef = (): IdbRef => {
  if (idbRef) return idbRef;
  const instance: typeof idb = (window as any).idb ?? idb;
  idbRef = {
    idb_openDB: instance.openDB,
    idb_deleteDB: instance.deleteDB,
  };
  return idbRef;
};

export const buildIdbKeyValRef = (): IdbKeyvalRef => {
  if (idbKeyvalRef) return idbKeyvalRef;
  const keyval: typeof idbKeyval = (window as any).idbKeyval ?? idbKeyval;
  idbKeyvalRef = {
    keyval_get: keyval.get,
    keyval_set: keyval.set,
    keyval_del: keyval.del,
    createStore: keyval.createStore,
    setMany: keyval.setMany,
  };
  return idbKeyvalRef;
};
