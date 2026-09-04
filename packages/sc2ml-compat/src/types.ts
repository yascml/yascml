
export type _Window = Window & typeof globalThis;

export interface Logger {
  log: (...args: any[]) => unknown;
  warn: (...args: any[]) => unknown;
  error: (...args: any[]) => unknown;
};
