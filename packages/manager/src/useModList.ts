import { useEffect, useState } from 'preact/hooks';
import type { ModMetaFull } from '@yascml/loader';

export const useModList = () => {
  const [ modList, setModList ] = useState<ModMetaFull[]>([]);
  const [ deletedMods, setDeletedMods ] = useState<string[]>([]);

  const handleModListUpdate = () => {
    setModList([ ...window.YASCML.mods ]);
  };

  const handleDeletedModsUpdate = () => {
    let _deletedMods: string[] = [];
    try {
      const deletedModsRaw = localStorage.getItem('yascml-deleted-mods');
      if (deletedModsRaw) {
        _deletedMods = JSON.parse(deletedModsRaw) as string[];

        if (!(_deletedMods instanceof Array))
          throw new Error('Failed to load deleted mods list: wrong format');
      }

      setDeletedMods(_deletedMods);
    } catch (e) {
      console.warn(e);
    }
  };

  const getMod = (modId: string) => {
    const index = modList.findIndex((e) => e.id === modId);
    if (index === -1) return null;
    return modList[index];
  };

  const deleteMod = (modId: string) => {
    const mod = getMod(modId);
    if (!mod) return;
    
    if (deletedMods.findIndex((e) => mod.id === e) !== -1) return;

    setDeletedMods((_o) => {
      const _n = [ ..._o, mod.id ];
      localStorage.setItem('yascml-deleted-mods', JSON.stringify(_n));
      return _n;
    });
  };

  const revertMod = (modId: string) => {
    const mod = getMod(modId);
    if (!mod) return;

    if (deletedMods.findIndex((e) => mod.id === e) === -1) return;

    setDeletedMods((_o) => {
      const _n = [ ..._o ];

      const index = _n.findIndex((e) => mod.id === e);
      _n.splice(index, 1);

      localStorage.setItem('yascml-deleted-mods', JSON.stringify(_n));
      return _n;
    });
  };

  const doManuallyUpdates = () => {
    handleDeletedModsUpdate();
    handleModListUpdate();
  };

  useEffect(() => {
    doManuallyUpdates();
  }, []);

  return {
    modList,
    deletedMods,
    getMod,
    deleteMod,
    revertMod,
    doManuallyUpdates
  };
};
