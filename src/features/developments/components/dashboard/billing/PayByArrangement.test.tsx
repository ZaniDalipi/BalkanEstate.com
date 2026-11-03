import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayByArrangement } from './PayByArrangement';

const renderBox = () => render(<PayByArrangement developmentId="d1" item="Buy Residence Pass" price="149 €" />);

afterEach(() => vi.restoreAllMocks());

describe('PayByArrangement', () => {
  it('says payment is agreed directly and writes the email to sales with the item, price and residence filled in', () => {
    renderBox();
    expect(screen.getByRole('heading', { name: 'billing.arrange.title' })).toBeInTheDocument();
    const mail = screen.getByRole('link', { name: 'billing.arrange.emailAria' });
    const href = decodeURIComponent(mail.getAttribute('href') ?? '');
    expect(href.startsWith('mailto:sales@balkanestateai.com?')).toBe(true);
    expect(href).toContain('subject=Buy Residence Pass · BalkanEstate');
    expect(href).toContain('body=billing.arrange.mailBody');
  });

  it('copies the address, and explains what to do when copying is blocked', async () => {
    const user = userEvent.setup();
    renderBox();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: 'billing.arrange.copy' }));
    expect(writeText).toHaveBeenCalledWith('sales@balkanestateai.com');
    expect(screen.getByRole('button', { name: 'billing.arrange.copied' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();

    writeText.mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'billing.arrange.copied' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('billing.arrange.copyFailed');
  });
});
