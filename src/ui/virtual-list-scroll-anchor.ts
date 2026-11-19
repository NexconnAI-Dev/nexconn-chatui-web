export const calculateViewportAnchorScrollTop = (
  scrollTop: number,
  currentViewportOffset: number,
  targetViewportOffset: number,
): number => Math.max(scrollTop + currentViewportOffset - targetViewportOffset, 0);

export interface VirtualResizeAnchorTransaction<T> {
  id: number;
  value: T;
}

export interface VirtualResizeAnchorController<T> {
  begin(value: T): VirtualResizeAnchorTransaction<T>;
  cancel(): void;
  isCurrent(transaction: VirtualResizeAnchorTransaction<T>): boolean;
  peek(): VirtualResizeAnchorTransaction<T> | null;
  take(): VirtualResizeAnchorTransaction<T> | null;
}

export const createVirtualResizeAnchorController = <T>(): VirtualResizeAnchorController<T> => {
  let revision = 0;
  let pending: VirtualResizeAnchorTransaction<T> | null = null;

  return {
    begin(value) {
      revision += 1;
      pending = { id: revision, value };
      return pending;
    },
    cancel() {
      revision += 1;
      pending = null;
    },
    isCurrent: transaction => transaction.id === revision,
    peek: () => pending,
    take() {
      const transaction = pending;
      pending = null;
      return transaction;
    },
  };
};
