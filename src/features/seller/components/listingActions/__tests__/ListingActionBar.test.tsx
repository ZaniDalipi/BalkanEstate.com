import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingActionBar } from '../ListingActionBar';
import { buildListingActions, type ListingActionInput } from '../../../utils/listingActions';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const base: ListingActionInput = {
  status: 'active', listingType: 'sale', createdAsRole: 'private_seller',
  imageCount: 2, hasVideo: false, canReassignToAgency: true, renewal: { canRenew: true },
};
const setup = (input: Partial<ListingActionInput> = {}) => {
  const onAction = vi.fn();
  const onEdit = vi.fn();
  const utils = render(<ListingActionBar actions={buildListingActions({ ...base, ...input })} onAction={onAction} onEdit={onEdit} />);
  return { onAction, onEdit, ...utils };
};

describe('ListingActionBar', () => {
  it('renders every action as a named button in one group', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Listing actions' });
    expect(group.querySelectorAll('button')).toHaveLength(5);
    for (const name of ['Promote', 'Create Video', 'Renew', 'Move to Agency', 'Mark as Sold']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('runs an available action', () => {
    const { onAction } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Renew' }));
    expect(onAction).toHaveBeenCalledWith('renew');
  });

  it('explains a blocked action and offers the editor instead of running it', () => {
    const { onAction, onEdit } = setup({ imageCount: 0 });
    const video = screen.getByRole('button', { name: 'Create Video' });
    expect(video).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(video);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Add photos to the listing first to create a video.');
    fireEvent.click(screen.getByRole('button', { name: 'Add photos' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('hides the reason once dismissed', () => {
    setup({ status: 'sold' });
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Available once the listing is active.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
