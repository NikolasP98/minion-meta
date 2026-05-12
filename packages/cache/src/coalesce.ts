export interface Coalescer<T> {
  run(key: string, loader: () => Promise<T>): Promise<T>;
}

export function createCoalescer<T>(): Coalescer<T> {
  const inFlight = new Map<string, Promise<T>>();
  return {
    run(key, loader) {
      const existing = inFlight.get(key);
      if (existing) return existing;
      const p = loader().finally(() => {
        if (inFlight.get(key) === p) inFlight.delete(key);
      });
      inFlight.set(key, p);
      return p;
    },
  };
}
