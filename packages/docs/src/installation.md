---
icon: floppy-disk
title: Install YASCML
prev: false
---

YASCML provides multiple installation methods. You can choose the best way based on your needs.

## Using online installer

Visit [online installer](https://yascml.github.io/install/) and follow the instructions.

## Using UserScript

Make sure you installed a proper userscript manager, then [click here](/yascml.user.js) to install.

The userscript runs on online SugarCube games on itch.io by default, you can add/modify `@match` labels of the script manually.

## Using CLI

### Install CLI from GitHub Packages Registry

First you need to create a Personal Access Token (classic) on GitHub and grant `read:packages` permission for it.

Then, run this command to login:

:::tabs#npm

@tab npm

```bash
npm login --scope=@yascml --auth-type=legacy --registry=https://npm.pkg.github.com

> Username: USERNAME
> Password: TOKEN
```
:::

Then you can install CLI via GitHub Packages Registry:

::: tabs#npm

@tab npm

```bash
npm install @yascml/patcher -g --registry=https://npm.pkg.github.com
```

@tab yarn

```bash
yarn add @yascml/patcher -g --registry=https://npm.pkg.github.com
```

@tab pnpm

```bash
pnpm add @yascml/patcher -g --registry=https://npm.pkg.github.com
```

:::

Then run `yascpatcher` or `npx yascpatcher` (if the former doesn't exists) to use the CLI.
