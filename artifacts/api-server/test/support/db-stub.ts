export const db = {
  execute: async () => ({ rows: [] }),
  insert: () => ({ values: async () => [] }),
  transaction: async (callback: (tx: { execute: typeof db.execute }) => unknown) =>
    callback({ execute: db.execute }),
};