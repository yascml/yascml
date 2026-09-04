import { cloneDeep } from 'lodash';
import { CacheRecord } from './cacheRecord';
import { Logger } from '../types';
import { buildLogger } from '../utils';

export type StyleTextFileItem = {
  id: number;
  name: string;
  content: string;
};

export type ScriptTextFileItem = {
  id: number;
  name: string;
  content: string;
};

export type PassageDataItem = {
  id: number;
  name: string;
  tags: string[];
  content: string;
  position?: string;
  size?: string;
};

const UserScriptFileReg = /\/\*\stwine-user-script\s#(\d+):\s"([^'"]+?)"\s\*\//g;
const UserStyleFileReg = /\/\*\stwine-user-stylesheet\s#(\d+):\s"([^'"]+?)"\s\*\//g;

/**
 * A container for all SugarCube game data, including all user scripts, styles, and passages.
 * 
 * This is only stored for data look-up, please do not modify data from here directly.
 * 
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L177
 */
export class SC2DataInfo {
  /**
   * Public logger, part of the SC2ML mod-facing data API.
   */
  readonly log: Logger = buildLogger();

  styleFileItems: CacheRecord<StyleTextFileItem>;
  scriptFileItems: CacheRecord<ScriptTextFileItem>;
  passageDataItems: CacheRecord<PassageDataItem>;

  constructor(
    public dataSource: string,
  ) {
    this.styleFileItems = new CacheRecord<StyleTextFileItem>(this.dataSource, 'styleFileItems');
    this.scriptFileItems = new CacheRecord<ScriptTextFileItem>(this.dataSource, 'scriptFileItems', true);
    this.passageDataItems = new CacheRecord<PassageDataItem>(this.dataSource, 'passageDataItems');
  }

  clean() {
    this.scriptFileItems.clean();
  }

  destroy() {
    this.styleFileItems.destroy();
    this.scriptFileItems.destroy();
    this.passageDataItems.destroy();
  }

  /**
   * Deep-clone this data into a plain {@link SC2DataInfo} (the canonical "modify a copy"
   * entry point used by mods).
   *
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L206
   */
  cloneSC2DataInfo() {
    const r = new SC2DataInfo(this.dataSource);
    r.styleFileItems = cloneDeep(this.styleFileItems);
    r.scriptFileItems = cloneDeep(this.scriptFileItems);
    r.passageDataItems = cloneDeep(this.passageDataItems);
    return r;
  }
}

/**
 * @see {@link SC2DataInfo}
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L204
 */
export class SC2DataInfoCache extends SC2DataInfo {
  /**
   * 
   * @param dataSource 
   * @param scriptNode 
   * @param styleNode 
   * @param passageDataNodes 
   * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/8a858233f30eaa0617454cf7c14448643c06d2b6/src/BeforeSC2/SC2DataInfoCache.ts#L221
   */
  constructor(
    public dataSource: string,
    public scriptNode: HTMLScriptElement[],
    public styleNode: HTMLStyleElement[],
    public passageDataNodes: HTMLElement[],
  ) {
    super(dataSource);

    for (const node of styleNode) {
      const styleText = node.innerText;
      const fileHeads = [ ...styleText.matchAll(UserStyleFileReg) ].reverse();

      for (let i = 0; i < fileHeads.length; i++) {
        const match = fileHeads[i];

        const startIndex = match.index! + match[0].length;
        const endIndex = i === 0 ? styleText.length : fileHeads[i - 1].index;

        this.styleFileItems.items.unshift({
          id: parseInt(match[1]!),
          name: match[2]!,
          content: styleText.slice(startIndex, endIndex),
        });
      }
    }
    this.styleFileItems.fillMap();

    for (const node of scriptNode) {
      const scriptText = node.innerText;
      const fileHeads = [ ...scriptText.matchAll(UserScriptFileReg) ].reverse();

      for (let i = 0; i < fileHeads.length; i++) {
        const match = fileHeads[i];

        const startIndex = match.index! + match[0].length;
        const endIndex = i === 0 ? scriptText.length : fileHeads[i - 1].index;

        this.scriptFileItems.items.unshift({
          id: parseInt(match[1]!),
          name: match[2]!,
          content: scriptText.slice(startIndex, endIndex),
        });
      }
    }
    this.scriptFileItems.fillMap();

    for (const passageDataNode of passageDataNodes) {
      this.passageDataItems.items.push({
        id: parseInt(passageDataNode.getAttribute('pid') || '0'),
        name: passageDataNode.getAttribute('name') || '',
        tags: passageDataNode.getAttribute('tags')?.split(' ') || [],
        content: passageDataNode.innerText || '',
        position: passageDataNode.getAttribute('position') || '',
        size: passageDataNode.getAttribute('size') || '',
      });
    }
    this.passageDataItems.fillMap();
  }

  destroy() {
    super.destroy();
  }
}
