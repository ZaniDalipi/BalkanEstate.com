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
    setup({ status: 'draft' });
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Available once the listing is active.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the pressed action working and parks the rest until it is done', () => {
    const onAction = vi.fn();
    render(<ListingActionBar actions={buildListingActions(base)} onAction={onAction} onEdit={vi.fn()} pendingTask="renew" />);
    const renew = screen.getByRole('button', { name: /Renew/ });
    expect(renew).toHaveAttribute('aria-busy', 'true');
    expect(renew).toHaveAttribute('data-state', 'working');
    expect(screen.getByRole('button', { name: 'Promote' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(renew);
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('shows why an action failed, with a retry', () => {
    const retry = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ListingActionBar
        actions={buildListingActions(base)}
        onAction={vi.fn()}
        onEdit={vi.fn()}
        feedback={{ kind: 'error', task: 'renew', text: { key: 'seller:myListings.actionError.renew', defaultValue: "The listing wasn't renewed. Please try again." }, retry }}
        onDismissFeedback={onDismiss}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent("The listing wasn't renewed. Please try again.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('confirms a finished action politely, without a retry', () => {
    render(
      <ListingActionBar
        actions={buildListingActions(base)}
        onAction={vi.fn()}
        onEdit={vi.fn()}
        feedback={{ kind: 'success', task: 'renew', text: { key: 'seller:myListings.actionDone.renewed', defaultValue: 'Renewed. Your listing is back at the top.' } }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Renewed. Your listing is back at the top.');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
