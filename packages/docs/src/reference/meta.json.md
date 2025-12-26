---
icon: book
title: meta.json
---

## `id`

* Type：`string`
* Example: `hello-world`

The identifier of this mod. This value must be unique and immutable.

## `name`

* Type：`string`
* Example: `Hello World`

The name of this mod, displayed in the mod manager.

## `author`

* Type：`ModAuthor`
* Example: `{ "name": "MisaLiu", "url": "https://misaliu.top" }`

The author(s) of this mod. Supports adding homepage links for author(s).

```jsonc
{
  // Single author, without homepage
  "author": "MisaLiu",
  // Multiple authors, without homepage
  "author": [ "MisaLiu", "foo" ],
  // Single author, with homepage
  "author": {
    "name": "MisaLiu",
    "url": "https://misaliu.top"
  },
  // Multiple authors, with homepage
  "author": [
    {
      "name": "MisaLiu",
      "url": "https://misaliu.top"
    },
    {
      "name": "foo",
      "url": "https://example.com"
    }
  ]
  // ...In the case of multiple authors, these formats (with or without homepage) can be mixed.
}
```

## `version`

* Type: `string`
* Example: `1.20.3`

The version of this mod. This value must comply with the [Semantic Versioning specification](https://semver.org/), otherwise the loader will refuse to load it.

## `priority`

* Type: `number`
* Default: `1000`

The loading priority of this mod. Smaller values are loaded earlier. If the mod depends on other mods, it will always load after mods without dependencies.

## `dependencies`

* Type: `Record<string, string>`
* Default: `void`

Other mods this mod depends on, expressed as key-value pairs of `modName:modVersion`. This structure is inspired by [npm `dependencies`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#dependencies).

## `designedFor`

* Type: `string`
* Default: `void`

Specifies which game this mod is designed for. Support stringified [RegExp](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions). If the value does not match the current game name, the loader will refuse to load it.

## `cssFiles`

* Type: `string[]`
* Default: `void`

Custom stylesheet file paths for this mod. These styles will be injected into the game before the SugarCube engine initializes.

## `preloadScripts`

* Type: `string[]`
* Default: `void`

Preload script file paths for this mod. These scripts will be loaded before the SugarCube engine initializes. If the scripts contain asynchronous operations, add the corresponding functions to the global array `window.__AfterInit`.

## `postloadScripts`

* Type: `string[]`
* Default: `void`

Postload script file paths for this mod. These scripts will be loaded after the SugarCube engine initializes. If the scripts contain asynchronous operations, add the corresponding functions to the global array `window.__AfterInit`.

## `icon`

* Type: `string`
* Default: `void`

The icon of this mod, displayed in the mod manager.

## `homepageURL`

* Type: `string`
* Default: `void`

The homepage link of this mod, displayed in the mod manager.

## `donateURL`

* Type: `string`
* Default: `void`

The donation page link of this mod, displayed in the mod manager.
