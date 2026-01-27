// Saved searches and properties types

import { Filters } from './property.types';

export interface SavedSearch {
  id: string;
  name: string;
  filters: Filters;
  drawnBoundsJSON: string | null;
  createdAt: number;
  lastAccessed: number;
  seenPropertyIds?: string[];
  // Alert settings
  alertsEnabled?: boolean;
  alertFrequency?: 'instant' | 'daily' | 'weekly';
}
