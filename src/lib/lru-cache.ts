import 'server-only';

export type LruCacheOptions = {
  max: number;
  ttlMs: number;
};

type Entry<V> = {
  value: V;
  expiresAt: number;
};

export class LruCache<K, V> {
  private readonly max: number;
  private readonly ttlMs: number;
  private map: Map<K, Entry<V>>;

  constructor(opts: LruCacheOptions) {
    this.max = opts.max;
    this.ttlMs = opts.ttlMs;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Move to most-recently-used position
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      for (const k of this.map.keys()) {
        this.map.delete(k);
        break;
      }
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  size(): number {
    return this.map.size;
  }

  __reset(): void {
    this.map.clear();
  }
}
