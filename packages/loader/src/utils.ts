import {
  valid as verValid,
  clean as verClean,
  satisfies as verSatisfies
} from 'semver';
import SparkMD5 from 'spark-md5';
import { ModMetaFile, ModMetaFull, ModFileMeta } from './types';

declare global {
  interface Blob {
    mozSlice?: typeof Blob.prototype.slice,
    webkitSlice?: typeof Blob.prototype.slice,
  }
}

export const triggerEvent = <T extends Object>(type: string, detail: T = {} as T) => (
  document.dispatchEvent(new CustomEvent(type, { detail }))
);

type ExecuteScriptConfig = Partial<{
  meta: Partial<ModFileMeta>,
  domProps: Partial<Record<keyof HTMLScriptElement & string, string>>;
}>;

export let isBlobAllowed: boolean | null = null;

export const readFileAsString = (file: Blob) => new Promise<string>((res, rej) => {
  const reader = new FileReader();

  reader.onload = () => res(reader.result as string);
  reader.onerror = (e) => rej(e);

  reader.readAsText(file);
});

/**
 * Can this page load `blob:`?
 * 
 * @returns {boolean}
 */
export const canLoadBlob = () => new Promise<boolean>((res) => {
  if (isBlobAllowed !== null) return res(isBlobAllowed);

  const bodyDom = document.getElementsByTagName('body')[0] || document.head;
  const blob = new Blob([';window.__isBlobAllowed = true;']);
  const url = URL.createObjectURL(blob);
  const dom = document.createElement('script');

  const destroyStuff = () => {
    res(!!isBlobAllowed);
    bodyDom.removeChild(dom);
    URL.revokeObjectURL(url);
    delete window.__isBlobAllowed;
  };

  dom.onload = () => {
    isBlobAllowed = window.__isBlobAllowed === true;
    destroyStuff();
  };

  dom.onerror = () => {
    isBlobAllowed = false;
    destroyStuff();
  };

  bodyDom.appendChild(dom);
  try {
    dom.src = url;
  } catch {
    isBlobAllowed = false;
    destroyStuff();
  }
});

/**
 * Basically an async alternative to `eval()`, support both script string and blob.
 */
export const executeScript = (script: string | Blob, config: ExecuteScriptConfig = {}) => new Promise((res, rej) => {
  const dom = document.createElement('script');
  dom.type = 'text/javascript';
  if (config.domProps) {
    Object.assign(dom, config.domProps);
  }
  if (config.meta) {
    Object.assign(dom.dataset, config.meta);
  }
  document.body.appendChild(dom);

  const errorHandler = (e: ErrorEvent) => {
    window.removeEventListener('error', errorHandler);
    rej(e.error);
  };

  // Inline scripts won't trigger this event.
  dom.addEventListener('load', () => {
    window.removeEventListener('error', errorHandler);
    res(void 0);
  });

  window.addEventListener('error', errorHandler);
  dom.addEventListener('error', errorHandler);

  if (typeof script !== 'string') {
    dom.src = URL.createObjectURL(script);
  } else {
    dom.innerHTML = script;
    setTimeout(() => {
      window.removeEventListener('error', errorHandler);
      res(void 0);
    }, 50);
  }
});

export const loadStyle = (style: string | Blob, meta?: Partial<Omit<ModFileMeta, 'timing'>>) => {
  if (typeof style === 'string') {
    const dom = document.createElement('style');
    dom.innerHTML = style;
    Object.assign(dom.dataset, meta);
    const headDOM = document.head ?? document.getElementsByTagName('head');
    headDOM.appendChild(dom);
  } else {
    const dom = document.createElement('link');
    dom.rel = 'stylesheet';
    dom.href = URL.createObjectURL(style);
    Object.assign(dom.dataset, meta);
    const headDOM = document.head ?? document.getElementsByTagName('head');
    headDOM.appendChild(dom);
  }
};

export const loadModScript = (
  script: string | Blob,
  config: ExecuteScriptConfig = {}
) => new Promise(async (res) => {
  if (isBlobAllowed === null)
    await canLoadBlob();

  if (typeof script === 'string' || isBlobAllowed)
    return res(executeScript(script, config));

  return res(
    executeScript(await readFileAsString(script), config)
  );
});

export const loadModStyle = (
  style: string | Blob,
  meta?: Partial<Omit<ModFileMeta, 'timing'>>
) => new Promise(async (res) => {
  if (isBlobAllowed === null)
    await canLoadBlob();

  if (typeof style === 'string' || isBlobAllowed)
    return res(loadStyle(style, meta));

  return res(
    loadStyle(await readFileAsString(style), meta)
  );
});

export const isValidModMeta = (obj: Partial<ModMetaFile>) => (
  obj.id !== (void 0) && obj.name !== (void 0) && obj.author !== (void 0) && obj.version !== (void 0) && verValid(verClean(obj.version))
);

export const sortMods = (a: ModMetaFull, b: ModMetaFull) => {
  const hasDepsA = a.dependencies !== (void 0) && Object.keys(a.dependencies).length > 0;
  const hasDepsB = b.dependencies !== (void 0) && Object.keys(b.dependencies).length > 0;

  if (hasDepsA !== hasDepsB) {
    return hasDepsA ? 1 : -1;
  }

  const priorityA = a.priority ?? 1000;
  const priorityB = b.priority ?? 1000;

  return priorityA - priorityB;
};

export const getFileMD5 = (file: Blob, chunkSize = 2097152): Promise<string> => new Promise((res, rej) => {
  const fileSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
  const chunks = Math.ceil(file.size / chunkSize);
  const spark = new SparkMD5.ArrayBuffer();
  const reader = new FileReader();
  let currentChunk = 0;

  reader.onload = (e) => {
    spark.append((e.target as FileReader).result as ArrayBuffer);
    currentChunk++;

    if (currentChunk < chunks) loadChunk();
    else {
      res(spark.end());
      spark.destroy();
    }
  };

  reader.onerror = (e) => {
    rej(e);
  };

  function loadChunk() {
    const start = currentChunk * chunkSize;
    const end = (start + chunkSize) < file.size ? start + chunkSize : file.size;
    reader.readAsArrayBuffer(fileSlice.call(file, start, end));
  }

  loadChunk();
});

export const isModSuitable = (mod: ModMetaFull) => {
  const { stats, mods, version } = window.YASCML;

  if (mod.designedFor !== (void 0)) {
    if (typeof mod.designedFor !== 'string') {
      if (!mod.designedFor.test(stats.gameName)) {
        console.warn(`Mod "${mod.id}" is not designed for current game "${stats.gameName}". This mod will not be loaded.`);
        return false;
      }
    } else if (mod.designedFor !== stats.gameName) {
      console.warn(`Mod "${mod.id}" is not designed for current game "${stats.gameName}". This mod will not be loaded.`);
      return false;
    }
  }

  if (mod.dependencies === (void 0)) return true;
  for (const modId in mod.dependencies) {
    if (modId === 'yascml') {
      if (!verSatisfies(version, mod.dependencies[modId])) {
        console.warn(`Mod "${mod.id}" requires loader v${version}, but found v${version}. This mod will not be loaded.`);
        return false;
      } else continue;
    }

    const modDep = mods.find(e => e.id === modId);
    if (!modDep) {
      console.warn(`Mod "${mod.id}" requires dependency "${modId}", but it's not installed. This mod will not be loaded.`);
      return false;
    }

    if (!modDep.enabled) {
      console.warn(`Mod "${mod.id}" requires dependency "${modId}", but it's not enabled. This mod will not be loaded.`);
      return false;
    }

    if (!modDep.suitable) {
      console.warn(`Mod "${mod.id}" requires dependency "${modId}", but it's not suitable for now. This mod will not be loaded.`);
      return false;
    }

    const requiredVersion = mod.dependencies[modId];
    if (!verSatisfies(modDep.version, requiredVersion)) {
      console.warn(`Mod "${mod.id}" requires dependency "${modId} v${requiredVersion}", but found v${modDep.version}. This mod will not be loaded.`);
      return false;
    }
  }

  return true;
};

export const unescapeHTML = (string: string) => {
  const dom = document.createElement('div');
  dom.innerHTML = string;
  return dom.innerHTML;
};
