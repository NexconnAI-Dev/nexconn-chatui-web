export interface VirtualListHeightCache {
  get(key: string): number | undefined;
  set(key: string, height: number): void;
  prune(validKeys: Set<string>): void;
  reset(): void;
  syncViewportWidth(width: number): boolean;
}

export const createVirtualListHeightCache = (): VirtualListHeightCache => {
  const heights = new Map<string, number>();
  let viewportWidth = 0;

  return {
    get: key => heights.get(key),
    set: (key, height) => heights.set(key, height),
    prune(validKeys) {
      heights.forEach((_, key) => {
        if (!validKeys.has(key)) heights.delete(key);
      });
    },
    reset() {
      heights.clear();
      viewportWidth = 0;
    },
    syncViewportWidth(width) {
      if (width <= 0) return false;
      const changed = viewportWidth > 0 && Math.abs(viewportWidth - width) > 0.5;
      viewportWidth = width;
      return changed;
    },
  };
};
