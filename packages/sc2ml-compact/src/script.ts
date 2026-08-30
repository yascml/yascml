/**
 * Minimal script/style injection helpers for sc2ml-compact.
 *
 * The loader runtime doesn't expose its `executeScript`/`loadStyle` as module
 * exports (it's a UMD bundle), so we provide equivalent small helpers here.
 * Scripts are executed as inline `<script>` elements; styles are appended to
 * `<head>` as standalone `<style>` elements (additive, never rewriting game data).
 */

/**
 * Execute a script string asynchronously (inline `<script>` appended to `<body>`).
 */
export const executeScript = (script: string): Promise<void> => new Promise((res, rej) => {
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

  // Inline scripts don't fire `load`; resolve on the next tick once executed.
  setTimeout(() => done(void 0), 0);
});

/**
 * Inject a style string as a standalone `<style>` element in `<head>`.
 * Additive only — never modifies existing game style nodes.
 */
export const loadStyle = (style: string, meta?: Record<string, string>): HTMLStyleElement => {
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
