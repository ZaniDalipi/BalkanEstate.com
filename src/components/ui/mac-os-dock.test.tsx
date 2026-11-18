import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MacOSDock from './mac-os-dock';
import { validateDockApp } from '@/shared/utils/validation';

const apps = [
  { id: 'a', name: 'Alpha', icon: 'https://media.test/a.png' },
  { id: 'b', name: 'Beta', icon: <svg data-testid="b-icon" />, badge: 3 },
];

describe('validateDockApp', () => {
  it('rejects missing id, name or icon', () => {
    expect(validateDockApp({ id: '', name: 'x', icon: 'i' }).isValid).toBe(false);
    expect(validateDockApp({ id: 'a', name: ' ', icon: 'i' }).error).toMatch(/name/);
    expect(validateDockApp({ id: 'a', name: 'x' }).error).toMatch(/icon/);
    expect(validateDockApp({ id: 'a', name: 'x', icon: 'i' }).isValid).toBe(true);
  });
});

describe('MacOSDock', () => {
  it('renders a named button per item and reports clicks', () => {
    const onAppClick = vi.fn();
    render(<MacOSDock apps={apps} onAppClick={onAppClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(onAppClick).toHaveBeenCalledWith('b');
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('marks open items as pressed when toggleable', () => {
    render(<MacOSDock apps={apps} onAppClick={() => {}} openApps={['a']} toggleable />);
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Beta' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('skips invalid and duplicate items instead of failing', () => {
    const bad = [...apps, { id: 'a', name: 'Dup', icon: 'x' }, { id: 'c', name: '', icon: 'x' }];
    render(<MacOSDock apps={bad} onAppClick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shows a letter when an image fails to load', () => {
    render(<MacOSDock apps={[apps[0]]} onAppClick={() => {}} />);
    fireEvent.error(document.querySelector('img') as HTMLImageElement);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders nothing when there are no valid items', () => {
    const { container } = render(<MacOSDock apps={[]} onAppClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
