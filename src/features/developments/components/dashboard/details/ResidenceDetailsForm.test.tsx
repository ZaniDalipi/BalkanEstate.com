import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { Development } from '../../../types';

vi.mock('../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, updateDevelopment: vi.fn() };
});

import * as api from '../../../api/developmentsApi';
import { ResidenceDetailsForm } from './ResidenceDetailsForm';

const dev = {
  id: 'd1',
  name: 'Plaza',
  country: 'Albania',
  city: 'Tirana',
  address: 'Tirana, Albania',
  lat: 41.3275,
  lng: 19.8187,
  category: 'apartment_building',
  constructionStatus: 'planned',
  amenities: ['Pool'],
  updatedAt: '2026-10-01T00:00:00Z',
} as unknown as Development;

const renderForm = (canEdit = true) =>
  render(
    <NotificationProvider>
      <ResidenceDetailsForm development={dev} canEdit={canEdit} />
    </NotificationProvider>,
  );

describe('ResidenceDetailsForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves only what changed, including amenities and municipality', async () => {
    vi.mocked(api.updateDevelopment).mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderForm();
    const save = screen.getByRole('button', { name: 'details.save' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('details.municipality'), 'Njësia 5');
    await user.type(screen.getByPlaceholderText('details.amenityPlaceholder'), 'Gym{Enter}');
    await user.click(screen.getAllByRole('button', { name: 'details.removeAmenity' })[0]);
    await user.click(save);

    await waitFor(() => expect(api.updateDevelopment).toHaveBeenCalledTimes(1));
    expect(api.updateDevelopment).toHaveBeenCalledWith('d1', { municipality: 'Njësia 5', amenities: ['Gym'] });
  });

  it('blocks saving an invalid email and shows the message', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('details.contactEmail'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'details.save' }));
    expect(await screen.findByText('validation.emailInvalid')).toBeInTheDocument();
    expect(api.updateDevelopment).not.toHaveBeenCalled();
  });

  it('is read-only without edit rights', () => {
    renderForm(false);
    expect(screen.getByLabelText(/wizard.name/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'details.save' })).not.toBeInTheDocument();
  });
});
