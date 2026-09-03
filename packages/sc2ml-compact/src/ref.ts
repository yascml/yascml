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

// Cached so callers don't rebuild the ref object on every call.
let idbKeyvalRef: IdbKeyvalRef | undefined;
let idbRef: IdbRef | undefined;

/**
 * NOTE: we deliberately do NOT trust `window.idb` here — SugarCube games
 * (e.g. Degrees of Lewdity) define their own `window.idb` for saves, which
 * would shadow the `idb` npm package. Always use the bundled module.
 */
export const buildIdbRef = (): IdbRef => {
  if (idbRef) return idbRef;
  idbRef = {
    idb_openDB: idb.openDB,
    idb_deleteDB: idb.deleteDB,
  };
  return idbRef;
};

const looksLikeIdbKeyval = (v: any): v is typeof idbKeyval => (
  !!v && typeof v.get === 'function' && typeof v.set === 'function'
  && typeof v.del === 'function' && typeof v.createStore === 'function'
);

/**
 * Prefer the loader-installed `window.idbKeyval` global when it looks like the
 * real idb-keyval API (the loader sets this). Fall back to the bundled module.
 */
export const buildIdbKeyValRef = (): IdbKeyvalRef => {
  if (idbKeyvalRef) return idbKeyvalRef;
  const keyval: typeof idbKeyval = looksLikeIdbKeyval((window as any).idbKeyval)
    ? (window as any).idbKeyval
    : idbKeyval;
  idbKeyvalRef = {
    keyval_get: keyval.get,
    keyval_set: keyval.set,
    keyval_del: keyval.del,
    createStore: keyval.createStore,
    setMany: keyval.setMany,
  };
  return idbKeyvalRef;
};
