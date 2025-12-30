import { useEffect, useState } from 'preact/hooks';
import { getLocalStorageAsArray } from '@yascml/utils';
import type { ModMetaFull } from '@yascml/loader';

export const useModList = () => {
  const [ modList, setModList ] = useState<ModMetaFull[]>([]);
  const [ deletedMods, setDeletedMods ] = useState<string[]>([]);

  const handleModListUpdate = () => {
    setModList([ ...window.YASCML.mods ]);
  };

  const handleDeletedModsUpdate = () => {
    const _n = getLocalStorageAsArray<string>('yascml-deleted-mods');
    setDeletedMods(_n);
  };

  const updateDisabledModList = () => {
    const _n: string[] = [];

    window.YASCML.mods
      .filter((e) => !e.enabled)
      .forEach((mod) => {
        _n.push(mod.id);
      });

    localStorage.setItem('yascml-disabled-mods', JSON.stringify(_n));
  };

  const UpdatesAllLists = () => {
    handleDeletedModsUpdate();
    handleModListUpdate();
    updateDisabledModList();
  };

  const getMod = (modId: string) => {
    return window.YASCML.mods.get(modId);
  };

  const enableMod = (modId: string) => {
    const mod = window.YASCML.mods.get(modId);
    if (!mod) return;
    if (mod.enabled) return;

    mod.enabled = true;
    UpdatesAllLists();
  };

  const disableMod = (modId: string) => {
    const mod = window.YASCML.mods.get(modId);
    if (!mod) return;
    if (!mod.enabled) return;

    mod.enabled = false;
    UpdatesAllLists();
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

  useEffect(() => {
    UpdatesAllLists();

    document.addEventListener('$modadded', UpdatesAllLists);
    return (() => {
      document.addEventListener('$modadded', UpdatesAllLists);
    });
  }, []);

  return {
    modList,
    deletedMods,
    getMod,
    enableMod,
    disableMod,
    deleteMod,
    revertMod,
  };
};
