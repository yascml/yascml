import { importMod } from './importer';
import * as IDB from './storage';
import type { ModMetaFull } from './types';

export class ModList extends Array<ModMetaFull> {
  get(modId: string) {
    const index = this.findIndex(e => e.id === modId);
    if (index === -1) return null;
    return this[index];
  }

  async add(file: string | Blob) {
    const mod = await importMod(file);
    await IDB.set(mod.id, file);
  
    const oldModIndex = this.findIndex(e => e.id === mod.id);
    if (oldModIndex === -1) {
      mod.new = true;
      this.push(mod);
    } else {
      mod.updated = true;
      this.splice(oldModIndex, 1, mod);
    }
  }

  releaseFile(modId: string) {
    const mod = this.get(modId);
    if (!mod) return;
    if (mod.zip) delete mod.zip;
  }
}
