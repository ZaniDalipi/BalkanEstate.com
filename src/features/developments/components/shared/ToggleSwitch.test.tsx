import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleSwitch } from './ToggleSwitch';

const Harness = () => {
  const [on, setOn] = useState(false);
  return (
    <>
      <label htmlFor="sw">Step-free access</label>
      <ToggleSwitch id="sw" checked={on} onChange={setOn} />
    </>
  );
};

describe('ToggleSwitch', () => {
  it('is a named switch that toggles by click, its label and the keyboard', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Step-free access' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByText('Step-free access'));
    expect(sw).toHaveAttribute('aria-checked', 'false');
    sw.focus();
    await userEvent.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});
