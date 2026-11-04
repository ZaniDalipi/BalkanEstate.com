/**
 * Leaving a form with unsent data (back button, a link) asks first: keep
 * editing, save the draft and leave, or discard and leave.
 */
import React, { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Link, useNavigate } from 'react-router-dom';
import FormLeaveGuard, { shouldAskBeforeLeaving } from '../shared/components/forms/FormLeaveGuard';
import { useFormDraft, useDraftAutosave } from '../shared/hooks/useFormDraft';
import { formDraftKey, readFormDraft } from '../shared/utils/formDraftStorage';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.has(key) ? this.items.get(key)! : null; }
  key(index: number) { return Array.from(this.items.keys())[index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
});

const KEY = formDraftKey('leave-demo', 'u1');

const DemoForm: React.FC = () => {
  const draft = useFormDraft<{ name: string }>(KEY);
  const [name, setName] = useState(draft.restored?.name ?? '');
  const dirty = useDraftAutosave(draft, { name }, { name: '' });
  const go = useNavigate();
  return (
    <div>
      <FormLeaveGuard dirty={dirty} bypassRef={draft.stoppedRef} onDiscard={draft.finish} />
      <input aria-label="name" value={name} onChange={e => setName(e.target.value)} />
      <Link to="/elsewhere">elsewhere</Link>
      <Link to="/form?tab=2">other tab</Link>
      <button type="button" onClick={() => { draft.finish(); go('/elsewhere'); }}>send</button>
    </div>
  );
};

const renderApp = () => {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>home page</p> },
      { path: '/form', element: <DemoForm /> },
      { path: '/elsewhere', element: <p>other page</p> },
    ],
    { initialEntries: ['/', '/form'], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText('name'), { target: { value } });

describe('shouldAskBeforeLeaving', () => {
  it('asks only when dirty, not bypassed and going to another page', () => {
    expect(shouldAskBeforeLeaving(true, false, '/a', '/b')).toBe(true);
    expect(shouldAskBeforeLeaving(false, false, '/a', '/b')).toBe(false);
    expect(shouldAskBeforeLeaving(true, true, '/a', '/b')).toBe(false);
    expect(shouldAskBeforeLeaving(true, false, '/a', '/a')).toBe(false);
  });
});

describe('FormLeaveGuard', () => {
  it('leaves without asking when nothing was typed', async () => {
    const router = renderApp();
    await act(async () => { await router.navigate(-1); });
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('asks on back press, and "Keep editing" stays on the form', async () => {
    const router = renderApp();
    type('Villa');
    await act(async () => { await router.navigate(-1); });

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /keep editing|formDraft\.stay/i }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('name')).toHaveValue('Villa');
  });

  it('Esc keeps editing too', async () => {
    const router = renderApp();
    type('Villa');
    await act(async () => { await router.navigate(-1); });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('name')).toBeInTheDocument();
  });

  it('"Save draft and leave" leaves and keeps the draft for next time', async () => {
    const router = renderApp();
    type('Villa');
    fireEvent.click(screen.getByText('elsewhere'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save draft|formDraft\.keepDraft/i }));
    });
    expect(screen.getByText('other page')).toBeInTheDocument();
    expect(readFormDraft<{ name: string }>(KEY)?.data.name).toBe('Villa');

    await act(async () => { await router.navigate('/form'); });
    expect(screen.getByLabelText('name')).toHaveValue('Villa');
  });

  it('"Discard and leave" leaves and forgets the draft', async () => {
    renderApp();
    type('Villa');
    fireEvent.click(screen.getByText('elsewhere'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /discard|formDraft\.discard/i }));
    });
    expect(screen.getByText('other page')).toBeInTheDocument();
    expect(readFormDraft(KEY)).toBeNull();
  });

  it('does not ask once the form was sent, or when only the query changes', async () => {
    renderApp();
    type('Villa');
    fireEvent.click(screen.getByText('other tab'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'send' })); });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('other page')).toBeInTheDocument();
  });
});
