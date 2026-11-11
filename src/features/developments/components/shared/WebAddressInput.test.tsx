import { describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WebAddressInput } from './WebAddressInput';

const Field = ({ initial = '', onChange = vi.fn() }: { initial?: string; onChange?: (v: string) => void }) => {
  const [value, setValue] = useState(initial);
  return (
    <WebAddressInput
      label="Website"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
};

describe('WebAddressInput', () => {
  it('shows https:// in front, so only www.x.com or x.com is typed', () => {
    render(<Field />);
    expect(screen.getByText('https://')).toBeInTheDocument();
    const input = screen.getByLabelText('Website');
    expect(input).toHaveAttribute('placeholder', 'www.example.com');
    expect(input).toHaveAttribute('inputmode', 'url');
    fireEvent.change(input, { target: { value: 'x.com' } });
    expect(input).toHaveValue('x.com');
  });

  it('drops a pasted or typed scheme, and shows a saved address without it', () => {
    const onChange = vi.fn();
    render(<Field initial="https://www.saved.mk" onChange={onChange} />);
    const input = screen.getByLabelText('Website');
    expect(input).toHaveValue('www.saved.mk');
    fireEvent.change(input, { target: { value: 'https://www.balkanestateai.com ' } });
    expect(onChange).toHaveBeenLastCalledWith('www.balkanestateai.com');
    expect(input).toHaveValue('www.balkanestateai.com');
  });
});
