import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Modal from './Modal';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

describe('Modal stacking', () => {
  it('Esc closes only the top modal', () => {
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    render(
      <>
        <Modal isOpen onClose={closeBottom} title="Bottom">bottom</Modal>
        <Modal isOpen onClose={closeTop} title="Top">top</Modal>
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();
  });

  it('a single modal still closes on Esc', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Only">x</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
