import * as idb from 'idb';
import * as idbKeyval from 'idb-keyval';

export const buildIdbRef = () => ({
  idb_openDB: idb.openDB,
  idb_deleteDB: idb.deleteDB,
});

export const buildIdbKeyValRef = () => ({
  keyval_get: idbKeyval.get,
  keyval_set: idbKeyval.set,
  keyval_del: idbKeyval.del,
  createStore: idbKeyval.createStore,
  setMany: idbKeyval.setMany,
});
