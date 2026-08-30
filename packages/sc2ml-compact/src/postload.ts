import { SC2DataManager } from './class/dataManager';

/**
 * Postload entry: runs after the engine boots.
 *
 * 1. Runs post-engine SC2ML scripts (user scripts + preload lists), ending with
 *    `ModLoaderLoadEnd` (the last lifecycle hook).
 * 2. Provides a small runtime helper so SC2ML mods can subscribe to engine-native
 *    SC2 events (`whenSC2StoryReady`, `whenSC2PassageInit/Start/Render/Display/End`)
 *    via the data manager's event tracer.
 */
const run = async () => {
  const dm: SC2DataManager | undefined = window.modSC2DataManager;
  if (!dm) {
    console.warn('sc2ml-compact: modSC2DataManager not found, skipping postload scripts');
    return;
  }

  try {
    await dm.runPostloadScripts();
  } catch (e) {
    console.error('sc2ml-compact: error running postload scripts', e);
  }

  // Expose a compat entry so mods can register SC2 runtime hooks post-engine.
  (window as any).modSC2EventTracer = dm.eventTracer;
};

run();
