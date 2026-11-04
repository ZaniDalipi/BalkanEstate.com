import { describe, it, expect } from 'vitest';
import { enterKeyAction } from '../shared/utils/formEnterKey';

const base = { key: 'Enter', ctrlKey: false, metaKey: false, targetTag: 'INPUT' };

describe('enterKeyAction', () => {
  it('does not send the form on Enter in a field', () => {
    expect(enterKeyAction(base)).toBe('block');
    expect(enterKeyAction({ ...base, targetTag: 'SELECT' })).toBe('block');
  });

  it('sends it on Ctrl+Enter or ⌘+Enter, from any field', () => {
    expect(enterKeyAction({ ...base, ctrlKey: true })).toBe('submit');
    expect(enterKeyAction({ ...base, metaKey: true })).toBe('submit');
    expect(enterKeyAction({ ...base, ctrlKey: true, targetTag: 'TEXTAREA' })).toBe('submit');
  });

  it('leaves textareas, buttons and links alone', () => {
    expect(enterKeyAction({ ...base, targetTag: 'TEXTAREA' })).toBe('ignore');
    expect(enterKeyAction({ ...base, targetTag: 'BUTTON' })).toBe('ignore');
    expect(enterKeyAction({ ...base, targetTag: 'a' })).toBe('ignore');
  });

  it('ignores other keys and IME composition', () => {
    expect(enterKeyAction({ ...base, key: 'a' })).toBe('ignore');
    expect(enterKeyAction({ ...base, isComposing: true })).toBe('ignore');
  });
});
