import './patcher/console';
import { replace } from '@yascml/utils';
import { showSplash, changeSplashText, hideSplash } from './splash';
import { initLoader } from './init/loader';
import { initPostloadMods, initPreloadMods } from './init/mods';
import { canLoadBlob, loadStyle, triggerEvent } from './utils';

if (document.querySelector('#script-sugarcube') || window.SugarCube != null) {
  throw new Error('The SugarCube engine already initialized! Aborting...');
}

if (window.YASCML != null) {
  throw new Error('Another YASCML is running! Aborting...');
}

if (window.Reflect == null) {
  throw new Error('Your browser is too old! Upgrade your browser to use YASCML');
}

canLoadBlob().finally();

window.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('script#script-sugarcube')) {
    throw new Error('This is not a SugarCube game! YASCML will not run.');
  }

  loadStyle([
    '@keyframes _YASCML_BLINK_ {',
    'from { opacity: 1; }',
    'to { opacity: 0; }',
    '}',
  ].join('\n'));

  showSplash();

  if (window.__SUGARCUBE_PATCHER) {
    changeSplashText('Patching engine...');

    try {
      await Promise.resolve(window.__SUGARCUBE_PATCHER());
    } catch (e) {
      console.error('Error when patching engine:');
      console.error(e);
    }
  }

  if (!window.$SugarCube) {
    hideSplash();
    throw new Error('You are running YASCML on a original SugarCube engine! Please patch the engine first.');
  }

  const sc = window.SugarCube;
  const sci = window.$SugarCube!;
  if (!sc) {
    hideSplash();
    throw new Error('SugarCube not loaded properly!');
  }

  const lockId = sci.LoadScreen.lock();
  sci.LoadScreen.init();

  // Init loader
  await initLoader();

  // Add mod menu list to sidebar
  replace(sc.UIBar, 'init', {
    value() {
      this.$init();

      const navDOM = document.querySelector('#menu') as HTMLDivElement;
      const menuListDOM = document.createElement('ul');

      menuListDOM.id = 'menu-yascml';
      navDOM.appendChild(menuListDOM);
    },
  });

  if (document.normalize) document.normalize();

  initPreloadMods()
    .then(() => {
      changeSplashText('Loading game engine...');
      return Promise.resolve(sci.$init.initEngine());
    })
    .then(() => initPostloadMods())
    .then(() => {
      delete window.__AfterInit;
      window.YASCML.stats.isEngineInit = true;
      changeSplashText('Starting game...');

      setTimeout(() => {
        hideSplash();
        sci.LoadScreen.unlock(lockId);
        triggerEvent('$gamestarted');
      }, (sc.Engine.DOM_DELAY ?? sc.Engine.minDomActionDelay) * 2);
    })
    .catch((e) => {
      console.error(e);
      hideSplash();
      sci.LoadScreen.clear();
      return sci.Alert.fatal(null, e.message);
    });
});
