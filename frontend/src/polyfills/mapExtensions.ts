/**
 * Polyfills for Map/WeakMap methods used by pdf.js 6.x on browsers
 * that don't support them natively yet.
 */
type MapCallback<T> = (key: unknown) => T;

declare global {
  interface Map<K, V> {
    getOrInsertComputed(key: K, callbackfn: MapCallback<V>): V;
    getOrInsert(key: K, defaultValue: V): V;
  }

  interface WeakMap<K extends WeakKey, V> {
    getOrInsertComputed(key: K, callbackfn: MapCallback<V>): V;
  }
}

if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function getOrInsertComputed(key, callbackfn) {
    if (this.has(key)) {
      return this.get(key)!;
    }
    const value = callbackfn(key);
    this.set(key, value);
    return value;
  };
}

if (!Map.prototype.getOrInsert) {
  Map.prototype.getOrInsert = function getOrInsert(key, defaultValue) {
    if (this.has(key)) {
      return this.get(key)!;
    }
    this.set(key, defaultValue);
    return defaultValue;
  };
}

if (!WeakMap.prototype.getOrInsertComputed) {
  WeakMap.prototype.getOrInsertComputed = function getOrInsertComputed(key, callbackfn) {
    if (this.has(key)) {
      return this.get(key)!;
    }
    const value = callbackfn(key);
    this.set(key, value);
    return value;
  };
}

export {};

