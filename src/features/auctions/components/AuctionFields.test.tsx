import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AuctionFields from './AuctionFields';
import { draftAuction, type AuctionError, type AuctionFormValues } from '../utils/auctionDraft';

vi.mock('react-i18next', async () => (await import('@/src/features/listing-events/components/testI18n')).englishDefaults());

/** Mimics the listing form: validates on "publish" and shows the first problem. */
const Harness: React.FC<{ onValid: (v: unknown) => void }> = ({ onValid }) => {
  const [value, setValue] = useState<AuctionFormValues | null>(null);
  const [error, setError] = useState<AuctionError | null>(null);
  const publish = () => {
    if (!value) return onValid(undefined);
    const r = draftAuction(value, new Date());
    if (r.ok === false) setError(r.error); else onValid(r.value);
  };
  return (
    <>
      <AuctionFields value={value} onChange={(v) => { setValue(v); setError(null); }} error={error} />
      <button type="button" onClick={publish}>Publish</button>
    </>
  );
};

const nextMonth = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe('AuctionFields', () => {
  it('is off by default, so publishing sends no auction', () => {
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);
    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Publish'));
    expect(onValid).toHaveBeenCalledWith(undefined);
  });

  it('shows each problem next to its field, then accepts a complete auction', () => {
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);
    fireEvent.click(screen.getByRole('switch'));

    fireEvent.click(screen.getByText('Publish'));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose the auction date');

    // Typed digits get their slashes; an impossible date is explained.
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '31022027' } });
    expect(screen.getByLabelText('Date')).toHaveValue('31/02/2027');
    expect(screen.getByLabelText('Date')).toHaveAttribute('placeholder', 'dd/mm/yyyy');
    fireEvent.click(screen.getByText('Publish'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the date as dd/mm/yyyy');

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: nextMonth() } });
    fireEvent.click(screen.getByText('Publish'));
    expect(screen.getByRole('alert')).toHaveTextContent('Tell bidders where the auction takes place');

    fireEvent.click(screen.getByLabelText('Online'));
    fireEvent.click(screen.getByText('Publish'));
    expect(screen.getByRole('alert')).toHaveTextContent('Add the link where people can bid online');

    fireEvent.change(screen.getByLabelText('Auction link'), { target: { value: 'https://bank.example/a/1' } });
    fireEvent.change(screen.getByLabelText('Starting price (optional)'), { target: { value: '75000' } });
    fireEvent.click(screen.getByText('Publish'));
    expect(onValid).toHaveBeenCalledWith(expect.objectContaining({ mode: 'online', url: 'https://bank.example/a/1', startingPrice: 75000 }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
