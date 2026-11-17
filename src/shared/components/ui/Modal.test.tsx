import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/src/tests/test-utils';
import Modal from './Modal';

const open = () => {
  const onClose = vi.fn();
  render(
    <Modal isOpen onClose={onClose} title="Edit">
      <input aria-label="Name" />
    </Modal>
  );
  const backdrop = screen.getByRole('dialog').parentElement!;
  return { onClose, backdrop };
};

describe('Modal backdrop', () => {
  it('closes on a click that starts and ends outside the dialog', () => {
    const { onClose, backdrop } = open();
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a press inside (selecting text) is released outside', () => {
    const { onClose, backdrop } = open();
    fireEvent.mouseDown(screen.getByLabelText('Name'));
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });
});
