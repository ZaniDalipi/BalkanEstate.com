/**
 * A spreadsheet chosen on the create page, waiting for the new residence's
 * Inventory tab to open the import with it. Kept in memory only: a reload
 * drops it, and the owner simply chooses the file again.
 */
const pending = new Map<string, File>();

export const holdImportFile = (developmentId: string, file: File): void => {
  pending.set(developmentId, file);
};

/** The waiting file, without removing it (safe to call twice while rendering). */
export const peekImportFile = (developmentId: string): File | undefined => pending.get(developmentId);

export const clearImportFile = (developmentId: string): void => {
  pending.delete(developmentId);
};
