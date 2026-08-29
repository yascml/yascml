# AGENTS.md

YASCML (Yet Another SugarCube Mod Loader): a browser mod loader + hot-patcher for SugarCube (Twine) games. Monorepo managed by **Rush** (pnpm under the hood). Node >= 22.14.0 required.

## Commands (always via rush, never bare `npm`/`pnpm` at the repo root)

```sh
rush update                 # install dependencies (after pull/branch changes, run this)
rush build                  # dev build (incremental)
rush build:prod             # production build (minified; non-incremental)
rush extract                # copy prod/doc package dist to <root>/dist/<pkg>
rushx <script>              # run a package's npm script from inside that package dir
rush build --to @yascml/loader   # build one package and its deps
```

- There is **no root `package.json`**; scripts live per-package and are run via `rushx`.
- `dist/` and `common/temp/` are gitignored — build artifacts are never committed.
- Every package is built with **Vite** (TypeScript ~5.9). There are **no tests** and **no repo-wide lint**; only `packages/docs-install` has ESLint (`rushx lint` there).

## CI requirements (build.yml on main)

- `rush change --verify` runs on every push/PR. Touching any project requires a change file under `common/changes/@yascml/<pkg>/<branch>_<date>.json` — create via `rush change`. Only `@yascml/patcher` is published (`shouldPublish: true`); others still need change files per CI.
- The docs job deploys to a **separate repo** (`yascml/yascml.github.io`) via GitHub Pages.

## Packages and artifacts

| Package | Role | `rush extract` output |
|---|---|---|
| `packages/types` | Shared types (pure `.d.ts`, no build, shipped as `src`) | — |
| `packages/utils` | Shared utils (TS source, no build, consumed as `src/main.ts`) | — |
| `packages/scripts` | `extract.js` + build helpers | — |
| `packages/loader` | The browser loader runtime (UMD, global `YASCML`); patches `window.SugarCube` | `dist/loader/yascml.js` |
| `packages/manager` | Mod manager UI (Preact + Vite) | `dist/manager/yascmanager.zip` |
| `packages/hook` | SugarCube data-modification library | `dist/hook/yaschook.zip` |
| `packages/sc2ml-compact` | SC2ML compatibility mods | `dist/sc2ml-compact/sc2ml-compact.zip` |
| `packages/patcher` | Node-side game patcher + CLI (`yascpatcher`), only published package | `dist/patcher/` |
| `packages/userscript` | Tampermonkey script (vite-plugin-monkey) for hot-patching unpatched games | `dist/userscript/yascml.user.js` |
| `packages/docs` | vuepress-theme-hope docs (build output at `src/.vuepress/dist`) | `dist/docs/` |
| `packages/docs-install` | Online installer (React 19 + antd + zustand); `build:prod` uses `--base /install/` | `dist/docs-install/` |

## Gotchas

- **Build order matters for the userscript**: `packages/userscript/src/main.js` imports `../../loader/dist/yascml.nolib` directly. Build the loader before the userscript (or use `rush build`, which respects this via incremental ordering).
- The loader has two UMD variants from `packages/loader/config/`: `full` (bundles deps) and `nolib` (externalizes `jszip`, `idb-keyval`, `spark-md5`, emits `deps.json`). Dev mode is non-minified; `mode=production` minifies.
- Loader source uses compile-time defines `__LOADER_VERSION__` and `__DEVELOPMENT__` (from `vite.config.base.ts`); don't add runtime logic that depends on `package.json` directly.
- SugarCube globals are typed via `@types/twine-sugarcube` (`window.SugarCube`, `$SugarCube`); the loader aborts if the engine or another YASCML copy is already loaded.
- Docs and most source are bilingual: English under `packages/docs/src/` and Chinese under `packages/docs/src/zh/`. Keep both in sync.
- Commit messages use conventional format `type(scope): description` (e.g. `feat(loader): ...`, `refactor(manager): ...`).
