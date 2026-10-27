/**
 * The only module that touches localStorage. Every read and write is wrapped in
 * try/catch, so private mode, blocked storage or a full quota never crash the
 * game. Nothing is accessed at import time.
 * @module storage
 */

/**
 * @typedef {object} Store
 * @property {(key: string, fallback?: any) => any} get Parsed JSON value, or `fallback` when missing or unreadable.
 * @property {(key: string, value: any) => boolean} set Save a value as JSON; false when it could not be saved.
 */

/**
 * Create a JSON store over a Web Storage backend.
 * @param {() => (Pick<Storage, 'getItem' | 'setItem'> | null | undefined)} [getBackend]
 *   Returns the backend on every call (default: `globalThis.localStorage`); it may throw.
 * @returns {Store}
 */
export function createStorage(getBackend = () => globalThis.localStorage) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getBackend()?.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const backend = getBackend();
        if (!backend) return false;
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Shared store backed by the browser's localStorage. */
export const storage = createStorage();
