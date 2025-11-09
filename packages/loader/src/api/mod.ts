import * as IDB from '../storage';
import { addDisabledMod, removeDisabledMod } from '../settings';
import { importMod } from '../importer';
import { triggerEvent } from '../utils';

/**
 * Get a mod meta by its ID
 * @param {string} modId 
 * @returns 
 */
const get = (modId: string) => {
  const index = window.YASCML.mods.findIndex(e => e.id === modId);
  if (index === -1) return null;
  return window.YASCML.mods[index];
};

/**
 * Add a mod, could be a `Blob` or file url.
 * @param file 
 */
const add = async (file: string | Blob) => {
  const mod = await importMod(file);
  IDB.set(mod.id, file);

  const oldModIndex = window.YASCML.mods.findIndex(e => e.id === mod.id);
  if (oldModIndex === -1) {
    mod.new = true;
    window.YASCML.mods.push(mod);
  } else {
    mod.updated = true;
    window.YASCML.mods.splice(oldModIndex, 1, mod);
  }

  triggerEvent('$modadded', { mod });
};

/**
 * Remove a loaded mod.
 * @param modId 
 */
const remove = async (modId: string) => {
  const index = window.YASCML.mods.findIndex(e => e.id === modId);
  if (index === -1)
    throw new Error(`Cannot find mod ID: ${modId}`);

  await IDB.del(modId);
  removeDisabledMod(modId);
  const mod = window.YASCML.mods[index];
  mod.deleted = true;
  triggerEvent('$modremoved', { mod });
};

const enable = (modId: string) => {
  const mod = get(modId);
  if (!mod)
    throw new Error(`Cannot find mod ID: ${modId}`);

  removeDisabledMod(modId);
  mod.enabled = true;
  triggerEvent('$modenabled', { mod });
};

const disable = (modId: string) => {
  const mod = get(modId);
  if (!mod)
    throw new Error(`Cannot find mod ID: ${modId}`);

  addDisabledMod(modId);
  mod.enabled = false;
  triggerEvent('$moddisabled', { mod });
};

const releaseFiles = (modId: string) => {
  const mod = get(modId);
  if (!mod) return;
  if (mod.zip) delete mod.zip;
};

export default {
  add,
  remove,
  enable,
  disable,
  get,
  releaseFiles,
};
