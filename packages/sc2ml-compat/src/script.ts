/**
 * Script/style injection helpers for sc2ml-compat.
 *
 * Prefers the loader's own runtime utils (`window.YASCML.utils.executeScript` /
 * `.loadStyle`) so execution semantics (error handling, blob support) stay
 * consistent with the rest of YASCML. Falls back to a minimal local
 * implementation if the loader doesn't expose them.
 */

const getLoaderUtils = () => (window as any).YASCML?.utils;

/**
 * Execute a script string asynchronously. Prefers the loader's implementation.
 */
export const executeScript = (script: string): Promise<void> => {
  const utils = getLoaderUtils();
  if (utils?.executeScript) {
    return utils.executeScript(script);
  }

  // Fallback: inline `<script>` appended to `<body>`.
  return new Promise((res, rej) => {
    const dom = document.createElement('script');
    dom.type = 'text/javascript';
    dom.textContent = script;

    const done = (error?: unknown) => {
      window.removeEventListener('error', errorHandler);
      if (error) rej(error);
      else res(void 0);
    };
    const errorHandler = (e: ErrorEvent) => {
      done(e.error ?? new Error('Script execution failed'));
    };

    window.addEventListener('error', errorHandler);
    document.body.appendChild(dom);
    setTimeout(() => done(void 0), 0);
  });
};

/**
 * Inject a style string as a standalone `<style>` element in `<head>`.
 * Additive only — never modifies existing game style nodes.
 */
export const loadStyle = (style: string, meta?: Record<string, string>): HTMLStyleElement => {
  const utils = getLoaderUtils();
  if (utils?.loadStyle) {
    return utils.loadStyle(style, meta);
  }

  const dom = document.createElement('style');
  dom.type = 'text/css';
  dom.textContent = style;
  if (meta) {
    for (const [ k, v ] of Object.entries(meta)) dom.dataset[k] = v;
  }
  (document.head ?? document.getElementsByTagName('head')[0]).appendChild(dom);
  return dom;
};

/**
 * Inject a script as a standalone inline `<script>` element in `<body>`
 * (used for `inject_early` scripts, which upstream inserts as DOM scripts).
 */
export const injectEarlyScript = (script: string, meta?: Record<string, string>): HTMLScriptElement => {
  const dom = document.createElement('script');
  dom.type = 'text/javascript';
  dom.textContent = script;
  if (meta) {
    for (const [ k, v ] of Object.entries(meta)) dom.dataset[k] = v;
  }
  document.body.appendChild(dom);
  return dom;
};

export interface ScriptRunMeta {
  stage: string,
  modName: string,
  fileName: string,
}

/**
 * Execute a SC2ML script and await the completion of its asynchronous body.
 *
 * Mirrors upstream `JsPreloader.JsRunner`: the source is wrapped as an
 * `(async () => { return <source> })()` inline `<script>` (kept in the DOM so it
 * stays inspectable in devtools), and completion is signalled through a unique
 * `CustomEvent` dispatched when the returned promise settles. Because of the
 * leading `return`, the wrapped source is expected to be a single expression
 * (SC2ML mods' `earlyload`/`preload` files are async IIFEs, per the upstream
 * contract). A timeout guard rejects if no completion event arrives, so a
 * malformed script cannot hang the engine boot.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/JsPreloader.ts
 */
export const runScriptAwait = (script: string, meta: ScriptRunMeta, timeoutMs = 60_000): Promise<void> => new Promise((res, rej) => {
  const id = `${meta.stage}:${meta.modName}:${meta.fileName}`;
  const okType = `__yascml_sc2ml_ok:${id}`;
  const errType = `__yascml_sc2ml_err:${id}`;

  let timer: ReturnType<typeof setTimeout> | null = null;
  const cleanup = () => {
    if (timer !== null) clearTimeout(timer);
    document.removeEventListener(okType, onOk);
    document.removeEventListener(errType, onErr);
  };
  const onOk = () => {
    cleanup();
    res(void 0);
  };
  const onErr = (e: Event) => {
    cleanup();
    rej((e as CustomEvent).detail?.error ?? new Error(`Script failed: ${id}`));
  };

  document.addEventListener(okType, onOk);
  document.addEventListener(errType, onErr);
  timer = setTimeout(() => {
    cleanup();
    rej(new Error(`Timed out waiting for script completion: ${id}`));
  }, timeoutMs);

  const dom = document.createElement('script');
  dom.type = 'text/javascript';
  dom.textContent = [
    `(async () => { return ${script}\n})()`,
    `  .then(() => document.dispatchEvent(new CustomEvent(${JSON.stringify(okType)})))`,
    `  .catch((error) => document.dispatchEvent(new CustomEvent(${JSON.stringify(errType)}, { detail: { error } })));`,
  ].join('\n');
  dom.dataset.stage = meta.stage;
  dom.dataset.modName = meta.modName;
  dom.dataset.filename = meta.fileName;
  dom.dataset.awaited = 'true';
  document.body.appendChild(dom);
});
