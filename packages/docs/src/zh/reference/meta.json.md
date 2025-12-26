---
icon: book
title: meta.json
---

## `id`

* 类型：`string`
* 示例：`hello-world`

模组的标识符，请保证此项唯一且不可更改。

## `name`

* 类型：`string`
* 示例：`Hello World`

模组的名称，用于在模组管理器中展示。

## `author`

* 类型：`ModAuthor`
* 示例：`{ "name": "MisaLiu", "url": "https://misaliu.top" }`

模组的作者，可以是单个作者也可以是多个作者。支持添加作者的主页链接。

```jsonc
{
  // 单个作者，不带主页
  "author": "MisaLiu",
  // 多个作者，不带主页
  "author": [ "MisaLiu", "foo" ],
  // 单个作者，带主页
  "author": {
    "name": "MisaLiu",
    "url": "https://misaliu.top"
  },
  // 多个作者，带主页
  "author": [
    {
      "name": "MisaLiu",
      "url": "https://misaliu.top"
    },
    {
      "name": "foo",
      "url": "https://example.com"
    }
  ],
  // ...在多个作者的情况下，这些格式（带、不带主页）可以混合使用。
}
```

## `version`

* 类型：`string`
* 示例：`1.20.3`

模组的版本，该值必须符合 [语义化版本](https://semver.org/lang/zh-CN/) 规范，否则加载器会拒绝加载。

## `priority`

* 类型：`number`
* 默认值：`1000`

模组的加载优先级，值越小越优先加载。如果该模组依赖于其他模组，则永远后于没有依赖的模组加载。

## `dependencies`

* 类型：`Record<string, string>`
* 默认值：`void`

该模组依赖的其他模组，为一个 `模组名称:模组版本` 的键值对。该部分参考了 [npm `dependencies`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#dependencies) 的结构。

## `designedFor`

* 类型：`string`
* 默认值：`void`

指定该模组是为何款游戏设计的。该值支持文本化 [正则表达式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions)。如果该值与当前游戏名称不符，则加载器会拒绝加载。

## `cssFiles`

* 类型：`string[]`
* 默认值：`void`

模组的自定义样式文件目录，这些样式会在 SugarCube 引擎初始化前注入到游戏中。

## `preloadScripts`

* 类型：`string[]`
* 默认值：`void`

模组的预加载脚本目录，这些脚本会在 SugarCube 引擎初始化前加载。如果脚本中有异步操作，请将对应的函数添加到 `window.__AfterInit` 全局数组中。

## `postloadScripts`

* 类型：`string[]`
* 默认值：`void`

模组的后加载脚本目录，这些脚本会在 SugarCube 引擎初始化后加载。如果脚本中有异步操作，请将对应的函数添加到 `window.__AfterInit` 全局数组中。

## `icon`

* 类型：`string`
* 默认值：`void`

模组的图标，用于在模组管理器中展示。

## `homepageURL`

* 类型：`string`
* 默认值：`void`

模组的主页链接，用于在模组管理器中展示。

## `donateURL`

* 类型：`string`
* 默认值：`void`

模组的捐赠页链接，用于在模组管理器中展示。
