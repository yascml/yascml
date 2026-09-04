import lodash from 'lodash';
import * as idb from 'idb';
import '@yascml/loader';
import '@yascml/hook';

declare global {
  interface Window {
    lodash?: typeof lodash;
    idb?: typeof idb;
  }
}
