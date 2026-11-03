/**
 * Unsent form data is kept on this device and comes back next time, and a
 * form sends only once however fast it is clicked.
 */
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  formDraftKey,
  readFormDraft,
  writeFormDraft,
  removeFormDraft,
  pruneExpiredFormDrafts,
  FORM_DRAFT_TTL_MS,
} from '../shared/utils/formDraftStorage';
import { useFormDraft, useDraftAutosave } from '../shared/hooks/useFormDraft';
import { useSubmitGuard } from '../shared/hooks/useSubmitGuard';
import { useContactForm } from '../features/contact/hooks/use-contact-form';

/** The shared test setup stubs localStorage out; these tests need one that stores. */
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

describe('formDraftStorage', () => {
  it('keeps one draft per form and person', () => {
    expect(formDraftKey('contact', 'u1')).not.toBe(formDraftKey('contact', 'u2'));
    expect(formDraftKey('contact', null)).toBe(formDraftKey('contact', undefined));
    expect(formDraftKey('contact', null)).toContain('guest');
  });

  it('reads back what was written', () => {
    const key = formDraftKey('t', 'u');
    writeFormDraft(key, { name: 'Ana' }, 1000, 5000);
    expect(readFormDraft<{ name: string }>(key, 5500)).toEqual({ savedAt: 5000, expiresAt: 6000, data: { name: 'Ana' } });
  });

  it('drops a draft once it expires', () => {
    const key = formDraftKey('t', 'u');
    writeFormDraft(key, { name: 'Ana' }, 1000, 5000);
    expect(readFormDraft(key, 6000)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('ignores and removes entries that are not drafts', () => {
    const key = formDraftKey('t', 'u');
    localStorage.setItem(key, '{not json');
    expect(readFormDraft(key)).toBeNull();
    localStorage.setItem(key, JSON.stringify({ hello: 1 }));
    expect(readFormDraft(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('prunes only expired drafts', () => {
    const old = formDraftKey('old', 'u');
    const fresh = formDraftKey('fresh', 'u');
    writeFormDraft(old, 1, 10, 0);
    writeFormDraft(fresh, 2, FORM_DRAFT_TTL_MS, 0);
    localStorage.setItem('unrelated', 'x');
    pruneExpiredFormDrafts(100);
    expect(localStorage.getItem(old)).toBeNull();
    expect(localStorage.getItem(fresh)).not.toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('x');
  });

  it('removes a draft', () => {
    const key = formDraftKey('t', 'u');
    writeFormDraft(key, 1);
    removeFormDraft(key);
    expect(readFormDraft(key)).toBeNull();
  });
});

const KEY = formDraftKey('demo', 'u1');

/** A one-field form using the draft hooks the way the real forms do */
const DemoForm: React.FC<{ onSent?: () => void }> = ({ onSent }) => {
  const draft = useFormDraft<{ name: string }>(KEY);
  const [name, setName] = useState(draft.restored?.name ?? '');
  useDraftAutosave(draft, { name }, { name: '' });
  return (
    <div>
      {draft.restoredAt !== null && (
        <button type="button" onClick={() => { draft.discard(); setName(''); }}>start over</button>
      )}
      <input aria-label="name" value={name} onChange={e => setName(e.target.value)} />
      <button type="button" onClick={() => { draft.finish(); onSent?.(); }}>send</button>
    </div>
  );
};

describe('useFormDraft + useDraftAutosave', () => {
  it('saves what is typed and brings it back on the next visit', async () => {
    const first = render(<DemoForm />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Villa Sunset' } });
    await waitFor(() => expect(readFormDraft<{ name: string }>(KEY)?.data.name).toBe('Villa Sunset'));
    first.unmount();

    render(<DemoForm />);
    expect(screen.getByLabelText('name')).toHaveValue('Villa Sunset');
    expect(screen.getByRole('button', { name: 'start over' })).toBeInTheDocument();
  });

  it('saves at once when the app is hidden, without waiting for the debounce', () => {
    vi.useFakeTimers();
    try {
      render(<DemoForm />);
      fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Quick' } });
      expect(readFormDraft(KEY)).toBeNull();
      act(() => { window.dispatchEvent(new Event('pagehide')); });
      expect(readFormDraft<{ name: string }>(KEY)?.data.name).toBe('Quick');
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves on unmount, so leaving the page keeps the text', () => {
    vi.useFakeTimers();
    try {
      const view = render(<DemoForm />);
      fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Leaving' } });
      view.unmount();
      expect(readFormDraft<{ name: string }>(KEY)?.data.name).toBe('Leaving');
    } finally {
      vi.useRealTimers();
    }
  });

  it('forgets the draft once the form is sent, even when it then unmounts', () => {
    const view = render(<DemoForm />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Sent' } });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    view.unmount();
    expect(readFormDraft(KEY)).toBeNull();
  });

  it('start over empties the form and removes the draft', () => {
    writeFormDraft(KEY, { name: 'Old' });
    render(<DemoForm />);
    fireEvent.click(screen.getByRole('button', { name: 'start over' }));
    expect(screen.getByLabelText('name')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'start over' })).not.toBeInTheDocument();
    expect(readFormDraft(KEY)).toBeNull();
  });

  it('keeps nothing while the key is null', () => {
    const { result } = renderHook(() => {
      const draft = useFormDraft<{ a: number }>(null);
      useDraftAutosave(draft, { a: 1 }, { a: 0 });
      return draft;
    });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(result.current.restored).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});

describe('useSubmitGuard', () => {
  it('runs only one submit at a time, however fast it is called', async () => {
    let release!: () => void;
    const task = vi.fn(() => new Promise<string>(resolve => { release = () => resolve('done'); }));
    const { result } = renderHook(() => useSubmitGuard());

    let first!: Promise<string | undefined>;
    let second!: Promise<string | undefined>;
    act(() => {
      first = result.current.run(task);
      second = result.current.run(task); // the double click, before any re-render
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
    await expect(second).resolves.toBeUndefined();

    await act(async () => { release(); await first; });
    await expect(first).resolves.toBe('done');
    expect(result.current.isSubmitting).toBe(false);

    // free again afterwards
    await act(async () => { const p = result.current.run(task); release(); await p; });
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('frees the lock when the submit fails', async () => {
    const { result } = renderHook(() => useSubmitGuard());
    await act(async () => {
      await expect(result.current.run(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isLocked()).toBe(false);
  });
});

describe('useContactForm drafts and double submit', () => {
  const key = formDraftKey('contact', 'u1');
  const fill = (result: { current: ReturnType<typeof useContactForm> }) => {
    act(() => {
      result.current.handleChange({ target: { name: 'name', value: 'Ana Petrova' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: 'email', value: 'ana@example.com' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: 'message', value: 'I would like to know more.' } } as React.ChangeEvent<HTMLTextAreaElement>);
    });
  };

  it('sends once on a double submit', async () => {
    const { result } = renderHook(() => useContactForm(undefined, key));
    fill(result);
    let release!: () => void;
    const send = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    let first!: Promise<void>;
    act(() => {
      first = result.current.handleSubmit(send);
      void result.current.handleSubmit(send);
    });
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => { release(); await first; });
    expect(result.current.isSuccess).toBe(true);
  });

  it('restores an unsent message and clears it once sent', async () => {
    const first = renderHook(() => useContactForm(undefined, key));
    fill(first.result);
    first.unmount();
    expect(readFormDraft<{ message: string }>(key)?.data.message).toBe('I would like to know more.');

    const { result } = renderHook(() => useContactForm(undefined, key));
    expect(result.current.formData.name).toBe('Ana Petrova');
    expect(result.current.draftSavedAt).not.toBeNull();

    await act(async () => { await result.current.handleSubmit(() => Promise.resolve()); });
    expect(readFormDraft(key)).toBeNull();
  });

  it('keeps no draft without a key', () => {
    const { result, unmount } = renderHook(() => useContactForm());
    fill(result);
    unmount();
    expect(localStorage.length).toBe(0);
  });
});
