/**
 * Unfinished new listings are kept on this device for a few days, so a seller
 * who leaves the create-listing form (back button, closed tab, navigated away)
 * finds their work waiting when they return.
 *
 * IndexedDB rather than localStorage: it stores photo Files as-is, and photos
 * are usually the most tedious part to redo. Every call degrades to a no-op
 * where IndexedDB is unavailable (private mode, tests) - a draft is a
 * convenience, never a reason for the form to fail.
 */

import type { ListingData, ImageData, FloorPlanDraft, Mode } from '../components/ListingFormHelpers';

/** How long an unfinished listing is kept */
export const LISTING_DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const DB_NAME = 'balkan-estate-listing-drafts';
const STORE = 'drafts';

export type DraftKind = 'sale' | 'rent';

export interface StoredImage {
    /** Local photo not yet uploaded */
    file: File | Blob | null;
    /** File name, kept separately since a stored File may come back as a Blob */
    name?: string;
    /** Remote URL for photos that were already hosted */
    url: string | null;
    floorplanSpot?: ImageData['floorplanSpot'];
}

export interface ListingDraft {
    savedAt: number;
    listingData: ListingData;
    images: StoredImage[];
    floorplans: (StoredImage & { label: string })[];
    selectedCountry: string;
    selectedCity: string;
    selectedRole: string;
    mode: Mode;
    step: 'init' | 'form';
}

export interface ListingDraftSummary {
    kind: DraftKind;
    title: string;
    savedAt: number;
    expiresAt: number;
}

export const draftKey = (userId: string, kind: DraftKind) => `${userId}:${kind}`;

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(resolve => {
        try {
            if (typeof indexedDB === 'undefined') return resolve(null);
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
            req.onblocked = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
};

const run = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> => {
    const db = await openDb();
    if (!db) return undefined;
    return new Promise(resolve => {
        try {
            const tx = db.transaction(STORE, mode);
            const req = fn(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(req.result);
            tx.onerror = () => resolve(undefined);
            tx.onabort = () => resolve(undefined);
        } catch {
            resolve(undefined);
        }
    });
};

const isExpired = (draft: ListingDraft, now = Date.now()) =>
    !draft?.savedAt || now - draft.savedAt > LISTING_DRAFT_TTL_MS;

/** Whether the form holds anything worth keeping */
export const draftHasContent = (d: Pick<ListingDraft, 'listingData' | 'images' | 'floorplans'>) =>
    d.images.length > 0 ||
    d.floorplans.length > 0 ||
    !!d.listingData.title?.trim() ||
    !!d.listingData.description?.trim() ||
    !!d.listingData.streetAddress?.trim() ||
    (d.listingData.price || 0) > 0;

export const toStoredImage = (img: ImageData): StoredImage | null => {
    if (img.file) return { file: img.file, name: img.file.name, url: null, ...(img.floorplanSpot ? { floorplanSpot: img.floorplanSpot } : {}) };
    // blob: URLs die with the page, so only hosted photos can be kept by URL
    if (img.previewUrl && !img.previewUrl.startsWith('blob:')) {
        return { file: null, url: img.previewUrl, ...(img.floorplanSpot ? { floorplanSpot: img.floorplanSpot } : {}) };
    }
    return null;
};

export const fromStoredImage = (img: StoredImage): ImageData => {
    const file = img.file
        ? (img.file instanceof File && img.file.name
            ? img.file
            : new File([img.file], img.name || 'photo.jpg', { type: img.file.type || 'image/jpeg' }))
        : null;
    return {
        file,
        previewUrl: file ? URL.createObjectURL(file) : (img.url || ''),
        ...(img.floorplanSpot ? { floorplanSpot: img.floorplanSpot } : {}),
    };
};

export const fromStoredFloorplan = (fp: StoredImage & { label: string }): FloorPlanDraft => ({
    ...fromStoredImage(fp),
    label: fp.label,
});

export const saveListingDraft = async (key: string, draft: ListingDraft): Promise<void> => {
    await run('readwrite', store => store.put(draft, key));
};

/** The draft for this key, or null. Expired drafts are removed on read. */
export const loadListingDraft = async (key: string): Promise<ListingDraft | null> => {
    const draft = await run<ListingDraft>('readonly', store => store.get(key));
    if (!draft) return null;
    if (isExpired(draft)) {
        await clearListingDraft(key);
        return null;
    }
    return draft;
};

export const clearListingDraft = async (key: string): Promise<void> => {
    await run('readwrite', store => store.delete(key));
};

/** The user's unexpired drafts, for showing on My Listings */
export const listListingDrafts = async (userId: string): Promise<ListingDraftSummary[]> => {
    const result: ListingDraftSummary[] = [];
    for (const kind of ['sale', 'rent'] as DraftKind[]) {
        const draft = await loadListingDraft(draftKey(userId, kind));
        if (draft) {
            result.push({
                kind,
                title: draft.listingData.title?.trim() || draft.listingData.streetAddress?.trim() || '',
                savedAt: draft.savedAt,
                expiresAt: draft.savedAt + LISTING_DRAFT_TTL_MS,
            });
        }
    }
    return result;
};
