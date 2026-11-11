/**
 * Enter in a long form should not send it: people press Enter to move on or
 * to confirm a field, not to publish. Ctrl+Enter (⌘+Enter on Mac) sends it.
 *
 * - Ctrl/⌘+Enter anywhere in the form → submit
 * - Enter in a text field or select    → nothing (the field's own Enter, such
 *   as "add this service", still runs first)
 * - Enter in a textarea                → a new line, as usual
 * - Enter on a button or link          → that button, as usual (a focused
 *   "Create" button pressed with Enter still creates)
 * - Enter while an IME is composing    → left to the IME
 */
export type EnterKeyAction = 'submit' | 'block' | 'ignore';

export interface EnterKeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  isComposing?: boolean;
  /** Tag name of the focused element, e.g. "INPUT" */
  targetTag: string;
}

export function enterKeyAction({ key, ctrlKey, metaKey, isComposing, targetTag }: EnterKeyInput): EnterKeyAction {
  if (key !== 'Enter' || isComposing) return 'ignore';
  if (ctrlKey || metaKey) return 'submit';
  const tag = targetTag.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return 'ignore';
  return 'block';
}

/** `onKeyDown` for a <form>: Enter no longer sends it, Ctrl/⌘+Enter does. */
export function handleFormEnterKey(e: React.KeyboardEvent<HTMLFormElement>): void {
  const target = e.target as HTMLElement;
  const action = enterKeyAction({
    key: e.key,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    isComposing: e.nativeEvent.isComposing,
    targetTag: target.tagName ?? '',
  });
  if (action === 'ignore') return;
  e.preventDefault();
  if (action === 'submit') e.currentTarget.requestSubmit();
}

/** True on Apple devices, where the shortcut is ⌘ rather than Ctrl. */
export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
