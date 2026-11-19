import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropertyInquiryModal from '../components/PropertyInquiryModal';
import type { Property } from '@/types';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { currentUser: null } }) }));
const api = vi.hoisted(() => ({ sendPropertyInquiry: vi.fn() }));
vi.mock('@/services/apiService', () => api);

const property = { id: 'p1', title: 'Sea view flat', city: 'Budva', country: 'Montenegro', price: 100000, images: [] } as unknown as Property;

const fill = () => {
  fireEvent.change(screen.getByLabelText(/Your Name/), { target: { value: 'Ana Buyer' } });
  fireEvent.change(screen.getByLabelText(/Your Email/), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText(/Your Message/), { target: { value: 'Is it available?' } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: /send/i }));

beforeEach(() => {
  api.sendPropertyInquiry.mockReset();
  window.localStorage.clear();
});

describe('PropertyInquiryModal', () => {
  it('sends the empty honeypot along with the inquiry', async () => {
    api.sendPropertyInquiry.mockResolvedValue({ message: 'ok', recipient: 'Agent' });
    render(<PropertyInquiryModal property={property} isOpen onClose={() => undefined} />);
    fill();
    submit();
    await waitFor(() => expect(api.sendPropertyInquiry).toHaveBeenCalledTimes(1));
    expect(api.sendPropertyInquiry.mock.calls[0][0]).toMatchObject({ propertyId: 'p1', buyerEmail: 'ana@example.com', confirm_details: '' });
  });

  it('shows a refused phone number next to the phone field', async () => {
    api.sendPropertyInquiry.mockRejectedValue(Object.assign(new Error('bad'), { code: 'phone_mismatch' }));
    render(<PropertyInquiryModal property={property} isOpen onClose={() => undefined} />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/same phone number/);
  });

  it('shows a duplicate refusal in the form banner', async () => {
    api.sendPropertyInquiry.mockRejectedValue(Object.assign(new Error('dup'), { code: 'duplicate_inquiry' }));
    render(<PropertyInquiryModal property={property} isOpen onClose={() => undefined} />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/already sent this inquiry/);
  });
});
