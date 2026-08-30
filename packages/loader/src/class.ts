import { importMod } from './importer';
import * as IDB from './storage';
import { triggerEvent } from './utils';
import type { ModMetaFull } from './types';

export class ModList extends Array<ModMetaFull> {
  get(modId: string) {
    const index = this.findIndex(e => e.id === modId);
    if (index === -1) return null;
    return this[index];
  }

  async add(file: string | Blob) {
    let input = file;
    if (typeof input !== 'string' && window.YASCML?.importPreprocess) {
      input = await window.YASCML.importPreprocess(input);
    }

    const mod = await importMod(input);
    await IDB.set(mod.id, input);

    const oldModIndex = this.findIndex(e => e.id === mod.id);
    if (oldModIndex === -1) {
      mod.new = true;
      this.push(mod);
    } else {
      mod.updated = true;
      this.splice(oldModIndex, 1, mod);
    }

    triggerEvent('$modadded', { mod });
  }

  releaseFile(modId: string) {
    const mod = this.get(modId);
    if (!mod) return;
    if (mod.zip) delete mod.zip;
  }
}
