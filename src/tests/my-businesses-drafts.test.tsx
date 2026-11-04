/**
 * My Businesses lists what was drafted on this device: an unpublished new
 * business (continue or discard it) and published ones with unsaved edits.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { writeFormDraft, readFormDraft } from '../shared/utils/formDraftStorage';
import {
  businessCreateDraftKey,
  businessEditDraftKey,
  readBusinessCreateDraft,
  readBusinessEditDrafts,
} from '../features/business-directory/utils/businessDrafts';

const navigate = vi.fn();
const confirm = vi.fn();
let listings: Array<Record<string, unknown>> = [];

vi.mock('@/src/app/router/navigation', () => ({ navigate: (...a: unknown[]) => navigate(...a), goBack: vi.fn() }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { currentUser: { id: 'u1' } }, dispatch: vi.fn() }) }));
vi.mock('@/src/shared/hooks/useConfirmation', () => ({ useConfirmation: () => ({ confirm }) }));
vi.mock('@/src/shared/hooks/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/src/features/business-directory/hooks', () => ({
  useMyBusinessListings: () => ({ listings, isLoading: false, error: null, refetch: vi.fn() }),
  useDeleteBusinessListing: () => ({ deleteListing: vi.fn() }),
}));

import MyBusinessListings from '../../components/shared/MyBusinessListings';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.has(key) ? this.items.get(key)! : null; }
  key(index: number) { return Array.from(this.items.keys())[index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
}

const createDraft = { formData: { name: 'Drita Cleaning', category: 'cleaning', city: 'Prishtina', country: 'Kosovo' } };
const published = {
  id: 'b1', name: 'Acme Law', category: 'real_estate_law', listingType: 'business', city: 'Skopje',
  country: 'North Macedonia', isActive: true, isVerified: false, views: 3, services: [],
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
  navigate.mockReset();
  confirm.mockReset();
  listings = [];
});

describe('businessDrafts', () => {
  it('summarises the unpublished business', () => {
    writeFormDraft(businessCreateDraftKey('u1'), createDraft, 1000, 10);
    expect(readBusinessCreateDraft('u1', 20)).toEqual({
      name: 'Drita Cleaning', category: 'cleaning', city: 'Prishtina', country: 'Kosovo', savedAt: 10, expiresAt: 1010,
    });
    expect(readBusinessCreateDraft('u2', 20)).toBeNull();
  });

  it('copes with a draft that has no form data yet', () => {
    writeFormDraft(businessCreateDraftKey('u1'), {});
    expect(readBusinessCreateDraft('u1')).toMatchObject({ name: '', category: '', city: '' });
  });

  it('finds which published businesses have unsaved edits', () => {
    writeFormDraft(businessEditDraftKey('b2', 'u1'), { x: 1 }, 1000, 50);
    expect(readBusinessEditDrafts('u1', ['b1', 'b2'], 60)).toEqual({ b2: 50 });
  });
});

describe('My Businesses drafts', () => {
  it('shows the draft instead of the empty state, and Continue opens the form', () => {
    writeFormDraft(businessCreateDraftKey('u1'), createDraft);
    render(<MyBusinessListings />);

    expect(screen.getByRole('heading', { name: /drafts/i })).toBeInTheDocument();
    expect(screen.getByText('Drita Cleaning')).toBeInTheDocument();
    expect(screen.queryByText(/no businesses yet|emptyTitle/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^continue$|drafts\.continue/i }));
    expect(navigate).toHaveBeenCalledWith('/business-directory/new');
  });

  it('discards the draft after confirming', async () => {
    writeFormDraft(businessCreateDraftKey('u1'), createDraft);
    confirm.mockResolvedValue(true);
    render(<MyBusinessListings />);

    fireEvent.click(screen.getByRole('button', { name: /^discard$|drafts\.discard/i }));
    await waitFor(() => expect(screen.queryByText('Drita Cleaning')).not.toBeInTheDocument());
    expect(readFormDraft(businessCreateDraftKey('u1'))).toBeNull();
    expect(screen.getByText(/no businesses yet|emptyTitle/i)).toBeInTheDocument();
  });

  it('keeps the draft when the discard is cancelled', async () => {
    writeFormDraft(businessCreateDraftKey('u1'), createDraft);
    confirm.mockResolvedValue(false);
    render(<MyBusinessListings />);
    fireEvent.click(screen.getByRole('button', { name: /^discard$|drafts\.discard/i }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(screen.getByText('Drita Cleaning')).toBeInTheDocument();
  });

  it('marks a published business with unsaved edits', () => {
    listings = [published];
    writeFormDraft(businessEditDraftKey('b1', 'u1'), { x: 1 });
    render(<MyBusinessListings />);
    expect(screen.getByText(/unsaved changes|drafts\.unsavedChanges/i)).toBeInTheDocument();
    expect(screen.getByText(/continue editing|drafts\.continueEditing/i).closest('button')).not.toBeNull();
  });

  it('shows no drafts section when nothing was drafted', () => {
    render(<MyBusinessListings />);
    expect(screen.queryByRole('heading', { name: /drafts/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no businesses yet|emptyTitle/i)).toBeInTheDocument();
  });
});
