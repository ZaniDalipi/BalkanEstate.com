/**
 * The create-business-listing form keeps what was typed on this device and
 * creates the listing only once, however fast "Create Listing" is clicked.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { formDraftKey, readFormDraft, writeFormDraft } from '../shared/utils/formDraftStorage';

const createListing = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { currentUser: { id: 'u1', email: 'me@example.com', phone: '' } }, dispatch: vi.fn() }),
}));

vi.mock('@/src/features/business-directory/hooks', () => ({
  useCreateBusinessListing: () => ({ createListing, isLoading: false, error: null }),
  useUploadBusinessLogo: () => ({ uploadLogo: vi.fn() }),
  useUploadBusinessBanner: () => ({ uploadBanner: vi.fn() }),
}));

vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({ default: () => null }));

import CreateBusinessListingForm from '../features/business-directory/components/CreateBusinessListingForm';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.has(key) ? this.items.get(key)! : null; }
  key(index: number) { return Array.from(this.items.keys())[index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
}

const KEY = formDraftKey('business-listing', 'u1');

const savedDraft = {
  listingType: 'business',
  formData: {
    name: 'Drita Cleaning',
    description: 'Homes and offices',
    category: 'cleaning',
    services: ['Deep clean'],
    contactPhone: '+38344123456',
    contactEmail: 'me@example.com',
    website: '',
    address: 'Prishtina, Kosovo',
    city: 'Prishtina',
    country: 'Kosovo',
    whatsapp: '',
    viber: '',
    languages: [],
    licenseNumber: '',
    serviceAreas: ['Prizren'],
    paymentMethods: ['cash'],
    socialMedia: { facebook: '', instagram: '', linkedin: '', tiktok: '' },
    businessHours: {},
  },
  contactPhone: '+38344123456',
  whatsappPhone: '',
  viberPhone: '',
  lat: 42.6629,
  lng: 21.1655,
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
  createListing.mockReset();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('CreateBusinessListingForm', () => {
  it('brings back an unfinished listing and offers to start over', () => {
    writeFormDraft(KEY, savedDraft);
    render(<CreateBusinessListingForm onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByDisplayValue('Drita Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Deep clean')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start over|formDraft\.startOver/i }));
    expect(screen.queryByDisplayValue('Drita Cleaning')).not.toBeInTheDocument();
    expect(readFormDraft(KEY)).toBeNull();
  });

  it('saves what is typed when the app goes to the background', () => {
    render(<CreateBusinessListingForm onBack={vi.fn()} onSuccess={vi.fn()} />);
    const name = document.querySelector<HTMLInputElement>('input[name="name"]')!;
    fireEvent.change(name, { target: { name: 'name', value: 'New Biz' } });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(readFormDraft<typeof savedDraft>(KEY)?.data.formData.name).toBe('New Biz');
  });

  it('creates the listing once on a double click, then forgets the draft', async () => {
    writeFormDraft(KEY, savedDraft);
    let finish!: (v: unknown) => void;
    createListing.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const onSuccess = vi.fn();
    render(<CreateBusinessListingForm onBack={vi.fn()} onSuccess={onSuccess} />);

    const submit = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(createListing).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();

    await act(async () => { finish({ listing: { id: 'b1' } }); });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(createListing).toHaveBeenCalledTimes(1);
    expect(readFormDraft(KEY)).toBeNull();
  });

  it('does not create the listing on Enter in a field, only on Ctrl+Enter', async () => {
    writeFormDraft(KEY, savedDraft);
    createListing.mockResolvedValue({ listing: { id: 'b1' } });
    render(<CreateBusinessListingForm onBack={vi.fn()} onSuccess={vi.fn()} />);
    const name = document.querySelector<HTMLInputElement>('input[name="name"]')!;

    // fireEvent returns false when the default action (the browser's Enter-to-submit) was cancelled
    expect(fireEvent.keyDown(name, { key: 'Enter' })).toBe(false);
    await act(async () => {});
    expect(createListing).not.toHaveBeenCalled();

    fireEvent.keyDown(name, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(createListing).toHaveBeenCalledTimes(1));
  });
});
