import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormSheet } from './FormSheet';

const asPhone = (phone: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: phone && q.includes('max-width'), media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));

const renderSheet = () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  render(
    <>
      <button type="button">opener</button>
      <FormSheet title="Add an entrance" formId="f1" submitLabel="Save entrance" onClose={onClose}>
        <form id="f1" onSubmit={onSubmit}>
          <input aria-label="Name" />
        </form>
      </FormSheet>
    </>
  );
  return { onClose, onSubmit };
};

afterEach(() => vi.unstubAllGlobals());

describe('FormSheet', () => {
  it('on phones: a sheet with Cancel · title · Save in its navigation bar; Save submits the form', () => {
    asPhone(true);
    const { onClose, onSubmit } = renderSheet();
    expect(screen.getByRole('dialog', { name: 'Add an entrance' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'sheet.save' }));
    expect(onSubmit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save entrance' })).toBeNull();
  });

  it('on wider screens: a dialog with the full Save button; Esc closes it and the page cannot scroll', () => {
    asPhone(false);
    const { onClose, onSubmit } = renderSheet();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Save entrance' }));
    expect(onSubmit).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
