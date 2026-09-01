/**
 * Script/style injection helpers for sc2ml-compact.
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
