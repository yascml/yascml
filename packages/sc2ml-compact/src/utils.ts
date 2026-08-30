import { Logger } from './types';

export const buildLogger = (): Logger => ({
  log: (...args) => console.log(...args), 
  warn: (...args) => console.warn(...args),
  error: (...error) => console.error(...error),
});
