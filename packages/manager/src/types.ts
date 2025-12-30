import type { ModMetaFull } from '@yascml/loader';

export type ModMeta = ModMetaFull & {
  deleted: boolean,
};
