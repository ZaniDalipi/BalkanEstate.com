import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { OpenHouseDraft } from '../types';
import OpenHouseDraftFields from './OpenHouseDraftFields';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const text = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts?.[k] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));

const Harness: React.FC<{ onChange?: (v: OpenHouseDraft[]) => void }> = ({ onChange }) => {
  const [value, setValue] = useState<OpenHouseDraft[]>([]);
  return <OpenHouseDraftFields value={value} onChange={(v) => { setValue(v); onChange?.(v); }} />;
};

const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe('OpenHouseDraftFields (listing form)', () => {
  it('is closed and empty until the seller opts in', () => {
    render(<Harness />);
    const toggle = screen.getByRole('button', { name: /Host an open house/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
  });

  it('adds a date, refuses an overlapping one, and removes it again', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Host an open house/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Add this date' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a date');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: nextWeek() } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this date' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);

    // Same date and default times again: overlaps the first one.
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: nextWeek() } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this date' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This time overlaps another open house');
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Remove the open house on/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
