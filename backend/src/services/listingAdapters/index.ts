export * from './types';
export * from './httpClient';
export * from './browserClient';

import type { SourceAdapter } from './types';

/** Registry of named listing adapters. Add adapters here as they are implemented. */
export const adapters: Record<string, SourceAdapter> = {};
