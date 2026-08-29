import { useState } from 'react';

/**
 * How much image data this visitor's connection should be asked to carry.
 *
 * - `full` — the default. Nothing is known against the connection, or it is fast.
 * - `lite` — a metered, saver-mode or 2G/3G-class connection: ask for fewer and
 *   smaller candidates and a cheaper quality level.
 */
export type ImageBudget = 'full' | 'lite';

/**
 * The Network Information API, which no TS lib def carries and no browser is
 * obliged to implement. Every field is optional on purpose — Chrome ships all
 * of them, Safari and Firefox ship none, and a missing field must read as
 * "unknown", never as "slow".
 */
interface NetworkInformationLike {
    saveData?: boolean;
    effectiveType?: string;
}

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g']);

function readConnection(): NetworkInformationLike | undefined {
    if (typeof navigator === 'undefined') return undefined;
    // `connection` is the standard name; the two prefixed ones are older
    // Chromium/Firefox spellings still found on the low-end Android devices
    // this hook exists for in the first place.
    const nav = navigator as Navigator & {
        connection?: NetworkInformationLike;
        mozConnection?: NetworkInformationLike;
        webkitConnection?: NetworkInformationLike;
    };
    return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

/** Reads the budget once. Exported for the hook and for tests. */
export function readImageBudget(): ImageBudget {
    try {
        const connection = readConnection();
        if (!connection) return 'full';
        if (connection.saveData === true) return 'lite';
        if (typeof connection.effectiveType === 'string' && SLOW_EFFECTIVE_TYPES.has(connection.effectiveType)) {
            return 'lite';
        }
        return 'full';
    } catch {
        // A throwing `navigator.connection` (privacy extensions do this) means
        // the connection is unknown, which is the `full` case — degrading every
        // visitor's photos because one API misbehaved is the worse failure.
        return 'full';
    }
}

/**
 * The image budget for this component's lifetime.
 *
 * Read once, at mount, and deliberately not kept live. The budget decides which
 * URLs a component builds, so re-reading it mid-visit would rewrite the `src`
 * of photos already on screen and make the browser fetch every one of them a
 * second time — paying more bytes to honour a request to spend fewer. A
 * connection that changes is picked up on the next page the visitor opens.
 *
 * Reading during render is safe here: `navigator.connection` is synchronous,
 * and the app mounts with `createRoot`, so there is no server-rendered markup
 * for a first-render difference to disagree with.
 *
 * The API is unsupported outside Chromium — which is precisely the engine on
 * the mid-range Android phones where a 3G connection and a 1400px hero photo
 * meet.
 */
export function useImageBudget(): ImageBudget {
    const [budget] = useState<ImageBudget>(readImageBudget);
    return budget;
}
