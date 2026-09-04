import type { SC2DataManager } from './class/dataManager';

/**
 * Native SugarCube jQuery events fired by the engine (no instrumentation needed).
 * @see https://github.com/tmedwards/sugarcube-2/blob/master/src/engine.js
 */
export interface Sc2EventTracerCallback {
  // Engine fired `:storyready`.
  whenSC2StoryReady?: () => any;
  // Engine fired `:passageinit`.
  whenSC2PassageInit?: (passage: any) => any;
  // Engine fired `:passagestart`.
  whenSC2PassageStart?: (passage: any, content: HTMLElement) => any;
  // Engine fired `:passagerender`.
  whenSC2PassageRender?: (passage: any, content: HTMLElement) => any;
  // Engine fired `:passagedisplay`.
  whenSC2PassageDisplay?: (passage: any, content: HTMLElement) => any;
  // Engine fired `:passageend`.
  whenSC2PassageEnd?: (passage: any, content: HTMLElement) => any;
}

type EventMap = {
  ':storyready': [ () => void ],
  ':passageinit': [ (passage: any) => void ],
  ':passagestart': [ (passage: any, content: HTMLElement) => void ],
  ':passagerender': [ (passage: any, content: HTMLElement) => void ],
  ':passagedisplay': [ (passage: any, content: HTMLElement) => void ],
  ':passageend': [ (passage: any, content: HTMLElement) => void ],
};

const EventList: { [K in keyof EventMap]: keyof Sc2EventTracerCallback } = {
  ':storyready': 'whenSC2StoryReady',
  ':passageinit': 'whenSC2PassageInit',
  ':passagestart': 'whenSC2PassageStart',
  ':passagerender': 'whenSC2PassageRender',
  ':passagedisplay': 'whenSC2PassageDisplay',
  ':passageend': 'whenSC2PassageEnd',
};

/**
 * Subscribes to the engine's native `:storyready` / `:passage*` jQuery events and
 * fans them out to registered {@link Sc2EventTracerCallback}s.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/Sc2EventTracer.ts
 */
export class Sc2EventTracer {
  constructor(
    public gSC2DataManager: SC2DataManager,
  ) {}

  callbacks: Sc2EventTracerCallback[] = [];
  private initialized = false;

  /**
   * Register event listeners on `jQuery(document)` for all engine events.
   * Safe to call once (guards against double-init).
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    const $ = (window as any).jQuery;
    if (typeof $ !== 'function') {
      console.warn('sc2ml-compat: jQuery not available, SC2 runtime hooks disabled');
      return;
    }

    for (const [ eventName, callbackKey ] of Object.entries(EventList) as [ keyof EventMap, keyof Sc2EventTracerCallback ][]) {
      $(document).on(eventName, (event: any) => {
        // The engine exposes `passage`/`content` on the event (and in `detail`).
        const detail = event.detail ?? event;
        const passage = detail.passage;
        const content = detail.content;

        for (const cb of this.callbacks) {
          const fn = cb[callbackKey];
          if (!fn) continue;
          try {
            if (eventName === ':storyready') {
              (fn as () => any).apply(cb, []);
            } else if (eventName === ':passageinit') {
              (fn as (p: any) => any).apply(cb, [ passage ]);
            } else {
              (fn as (p: any, c: HTMLElement) => any).apply(cb, [ passage, content ]);
            }
          } catch (e) {
            console.error(`sc2ml-compat: error in ${callbackKey} callback`, e);
          }
        }
      });
    }
  }

  addCallback(cb: Sc2EventTracerCallback) {
    this.callbacks.push(cb);
  }

  removeCallback(cb: Sc2EventTracerCallback) {
    const i = this.callbacks.indexOf(cb);
    if (i >= 0) this.callbacks.splice(i, 1);
  }
}
