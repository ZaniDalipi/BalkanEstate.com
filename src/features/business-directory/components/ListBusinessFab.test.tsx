import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ListBusinessFab from './ListBusinessFab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

describe('ListBusinessFab', () => {
  it('is absent while the inline button is on screen', () => {
    render(<ListBusinessFab visible={false} onClick={() => {}} />);
    expect(screen.queryByRole('button', { name: /list your business/i })).toBeNull();
  });

  it('shows a named button that starts the listing flow', () => {
    const onClick = vi.fn();
    render(<ListBusinessFab visible onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /list your business/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
