import type { SpellCheckSnapshot } from "../types/index.js";

export interface SpellCheckStore {
  getSnapshot(): SpellCheckSnapshot;
  publish(snapshot: SpellCheckSnapshot): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export function createStore(
  initialSnapshot: SpellCheckSnapshot,
): SpellCheckStore {
  let snapshot = initialSnapshot;
  let isDisposed = false;
  const listeners = new Set<() => void>();

  return {
    getSnapshot() {
      return snapshot;
    },
    publish(nextSnapshot) {
      if (isDisposed) {
        return;
      }

      snapshot = nextSnapshot;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      if (isDisposed) {
        return () => {};
      }

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (isDisposed) {
        return;
      }

      isDisposed = true;
      listeners.clear();
    },
  };
}
