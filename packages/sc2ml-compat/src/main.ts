import lodash from 'lodash';
import * as idb from 'idb';
import { SC2DataManager } from './class/dataManager';
import { ModUtils } from './class/modUtils';
import { ModLoaderController } from './class/modLoadController';
import { Sc2EventTracer } from './eventTracer';
import { registerImportPreprocess } from './mod/importPreprocess';

declare global {
  interface Window {
    modSC2DataManager: SC2DataManager,
    modUtils: ModUtils,
    modModLoadController: ModLoaderController,
    modSC2EventTracer: Sc2EventTracer,
  }
}

if (!window.lodash) window.lodash = lodash;
if (!window.idb) window.idb = idb;

registerImportPreprocess();

const dataManager = new SC2DataManager(window);

Object.defineProperty(window, 'modSC2DataManager', {
  value: dataManager,
});
Object.defineProperty(window, 'modUtils', {
  value: dataManager.modUtils,
});
Object.defineProperty(window, 'modModLoadController', {
  value: dataManager.modLoadController,
});
Object.defineProperty(window, 'modSC2EventTracer', {
  value: dataManager.eventTracer,
});

window.__AfterInit?.push(dataManager.startInit.bind(window.modSC2DataManager));
