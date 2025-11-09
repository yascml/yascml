import { patchEngineScript } from '@yascml/patcher';
import { fileSelect } from './file';
import '../../loader/dist/yascml.nolib'; // LOL

// Prevent SugarCube from initializing
document.documentElement.setAttribute('data-init', 'yascml-loading');

// Prevent the `data-init` attribute from being modified by others
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') continue;
    if (mutation.type === 'characterData') continue;
    if (mutation.attributeName !== 'data-init') continue;
    if (document.documentElement.getAttribute('data-init') === 'yascml-loading') continue;

    document.documentElement.setAttribute('data-init', 'yascml-loading');
  }
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: [ 'data-init' ] });

const waitElement = (selector, waitCount = 25) => new Promise((res, rej) => {
  const _query = () => {
    const dom = document.querySelector(selector);
    if (dom) {
      res(dom);
      return true;
    } else return false;
  };

  if (_query()) return;

  let clockCount = 0;
  const clockId = setInterval(() => {
    clockCount++;
    if (clockCount > waitCount) {
      rej(`Failed to find element: "${selector}"`);
      return clearInterval(clockId);
    }

    if (!_query()) return;
    return clearInterval(clockId);
  }, 200);
});

const patchEngine = async () => {
  try {
    const scriptDOM = await waitElement('script#script-sugarcube');
    if (!scriptDOM)
      throw new ReferenceError('<script id="script-sugarcube"> not found!');
    observer.disconnect();

    const engineScriptRaw = scriptDOM.firstChild.data;
    scriptDOM.parentElement.removeChild(scriptDOM);

    const _config = {
      embedModPath: [],
      custom: {
        export: [],
        init: {},
      },
      ...window.YASCMLConfig,
    };

    const engineScriptPatched = patchEngineScript(
      engineScriptRaw,
      _config.custom.export,
      _config.custom.init
    );

    const resultDOM = document.createElement('script');
    resultDOM.id = 'script-sugarcube';
    resultDOM.innerText = engineScriptPatched;

    document.body.appendChild(resultDOM);
  } finally {
    observer.disconnect();
  }
};

Reflect.defineProperty(window, '__SUGARCUBE_PATCHER', {
  configurable: false,
  writable: false,
  value: patchEngine,
});

const importMods = () => {
  fileSelect({
    accept: 'application/zip',
    multiple: true,
  }).then(async (files) => {
    let successCount = 0, failedCount = 0;

    for (const file of files) {
      try {
        await window.YASCML.api.mod.add(file);
        successCount++;
      } catch (e) {
        console.error(`Failed loading mod "${file.name}"`);
        console.error(e);
        failedCount++;
      }
    }

    alert(`Import finished, succeeded: ${successCount}, failed: ${failedCount}`);
  });
};

Reflect.defineProperty(window, '__ImportMods', {
  configurable: false,
  writable: false,
  value: importMods,
});

waitElement('head')
  .then((dom) => {
    const style = document.createElement('style');
    style.innerHTML = /*css*/`
html[data-init=yascml-loading] #init-screen {
  display: block;
}
html[data-init=yascml-loading] #init-loading {
  display: block;
  border: 24px solid transparent;
  border-radius: 50%;
  border-top-color: #7f7f7f;
  border-bottom-color: #7f7f7f;
  width: 100px;
  height: 100px;
  animation: init-loading-spin 2s linear infinite;
}
html[data-init=yascml-loading] #init-loading>div {
  text-indent: 9999em;
  overflow: hidden;
  white-space: nowrap;
}`;
    dom.appendChild(style);
  });

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('script#script-sugarcube')) return;

  observer.disconnect();
  document.documentElement.removeAttribute('data-init');
});

// Build an entry to import mods
document.addEventListener('$gamestarted', () => {
  try {
    window.YASCML.api.mod.get('yascmanager');
  } catch {
    const entryDOM = document.createElement('div');

    entryDOM.style = [
      'display: block',
      'position: fixed',
      'right: 0',
      'bottom: 0',
      'font-size: 0.75em',
      'color: #FFF',
      'text-shadow: 0 0 4px black',
      'opacity: 0.5',
      'cursor: pointer'
    ].join(';');
    entryDOM.innerText = '[Import Mods]';
    entryDOM.onclick = importMods;

    document.body.appendChild(entryDOM);
  }
});
