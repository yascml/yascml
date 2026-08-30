import { SC2DataManager } from './dataManager';
import { Logger } from '../types';
import { buildLogger } from '../utils';

type HookFnFull<R = boolean> = ((el: HTMLImageElement | HTMLElement, src: string, field: string) => R | Promise<R>);
type HookFn<R = unknown> = ((src: string) => R | Promise<R>);
type HookFnSync<R = unknown> = (src: string) => R;

export class HtmlTagSrcHook {
  readonly pSC2DataManager: SC2DataManager;
  /**
   * Public logger, part of the SC2ML mod-facing API.
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/HtmlTagSrcHook.ts
   */
  readonly logger: Logger;
  private hooks = new Map<string, HookFnFull>();
  private hooksReturned = new Map<string, HookFn<[ boolean, string ]>>();
  private hooksCheckExists = new Map<string, HookFnSync<boolean | undefined>>();

  constructor(dataManager: SC2DataManager) {
    this.pSC2DataManager = dataManager;
    this.logger = buildLogger();

    window.YASCHook.resources.image.hook(this.handleHook.bind(this));
  }

  addHook(key: string, fn: HookFnFull) {
    this.hooks.set(key, fn);
  }

  addReturnModeHook(key: string, fn: HookFn<[ boolean, string ]>) {
    this.hooksReturned.set(key, fn);
  }

  addCheckExistHook(key: string, fn: HookFnSync<boolean | undefined>) {
    this.hooksCheckExists.set(key, fn);
  }

  checkImageExist(src: string) {
    if (typeof src !== 'string' || !src) return (void 0);
    if (src.startsWith('data:')) return true;

    let maybeExists: boolean | undefined = false;
    for (const [ , hookFn ] of this.hooksCheckExists) {
      try {
        const r = hookFn(src);
        if (r === true) return true;
        if (r === (void 0)) maybeExists = (void 0);
      } catch {}
    }

    return maybeExists;
  }

  /**
   * We don't need this so it's not implemented.
   */
  async doHook() { return false }

  /**
   * We don't need this so it's not implemented.
   */
  async doHookCallback() { return [ false, (void 0) ] }

  async requestImageBySrc(src: string) {
    const context = { src, element: new Image };
    await window.YASCHook.resources.image.run(context);
    return context.src;
  }

  private async handleHook(context: { src: string, element: HTMLImageElement | SVGImageElement }, next: () => void) {
    const src = context.src;
    const el = document.createElement('null');
    const field = context.element instanceof HTMLImageElement ? 'src' : 'href';
    Object.assign(el, context.element);

    for (const [, hookFn ] of this.hooksReturned) {
      try {
        const r = await hookFn(src);
        if (r[0]) {
          context.src = r[1];
          return;
        }
      } catch {}
    }

    for (const [, hookFn ] of this.hooks) {
      try {
        if (await hookFn(el, context.src, field)) {
          context.src = el.getAttribute(field) ?? src;
          return;
        }
      } catch {}
    }

    next();
  }
}
