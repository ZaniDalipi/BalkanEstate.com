import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuilderSection } from './BuilderSection';
import type { Development } from '../../../types';

const h = vi.hoisted(() => ({ update: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('../../../hooks/useDevelopmentMutations', () => ({ useUpdateDevelopment: () => ({ update: h.update, isLoading: false }) }));
vi.mock('../../../hooks/useBuilderImages', () => ({ useBuilderImages: () => ({ upload: h.upload, remove: h.remove, busy: false }) }));

const dev = (over: Partial<Development> = {}) => ({ id: 'd1', name: 'Aurora', slug: 'aurora', ...over }) as Development;
const field = (name: string) => screen.getByLabelText(new RegExp(`^${name.replace('.', '\\.')}`)) as HTMLInputElement;
const save = () => userEvent.click(screen.getByRole('button', { name: 'builder.save' }));
const errorOf = (input: HTMLElement) => document.getElementById(input.getAttribute('aria-describedby') ?? '');

beforeEach(() => {
  h.update.mockReset().mockImplementation(async (p: { builder: unknown }) => ({ development: dev({ builder: p.builder as Development['builder'] }) }));
  h.upload.mockReset().mockResolvedValue({});
  h.remove.mockReset().mockResolvedValue({});
});

describe('BuilderSection', () => {
  it('saves the builder with trimmed text and numbers', async () => {
    render(<BuilderSection development={dev()} canEdit />);
    await userEvent.type(field('builder.name'), '  Balkan Build Group ');
    await userEvent.type(field('builder.foundedYear'), '2004');
    await userEvent.type(field('builder.website'), 'https://balkanbuild.example.com');
    await userEvent.type(field('Instagram'), 'https://instagram.com/bb');
    await save();
    await waitFor(() => expect(h.update).toHaveBeenCalledWith({ builder: { name: 'Balkan Build Group', foundedYear: 2004, website: 'https://balkanbuild.example.com', socials: { instagram: 'https://instagram.com/bb' } } }));
    expect(await screen.findByText('builder.saved')).toBeInTheDocument();
  });

  it('shows every problem next to its field and sends nothing', async () => {
    render(<BuilderSection development={dev()} canEdit />);
    await userEvent.type(field('builder.tagline'), 'Since 2004');
    await userEvent.type(field('builder.phone'), 'call us');
    await userEvent.type(field('Facebook'), 'https://evil.example.com/x');
    await save();
    expect(errorOf(field('builder.name'))).toHaveTextContent('developments:apiErrors.FIELD_REQUIRED');
    expect(errorOf(field('builder.name'))).toHaveAttribute('role', 'alert');
    expect(errorOf(field('builder.phone'))).toHaveTextContent('developments:apiErrors.PHONE_INVALID');
    expect(errorOf(field('Facebook'))).toHaveTextContent('developments:apiErrors.SOCIAL_HOST');
    expect(h.update).not.toHaveBeenCalled();
    // Fixing a field clears its message.
    await userEvent.type(field('builder.name'), 'B');
    expect(field('builder.name')).not.toHaveAttribute('aria-invalid');
  });

  it('puts a server refusal next to the field it names', async () => {
    h.update.mockRejectedValueOnce(
      Object.assign(new Error('builder.website must be an http(s) address'), { statusCode: 400, code: 'URL_INVALID', details: { code: 'URL_INVALID', details: { field: 'builder.website' } } })
    );
    render(<BuilderSection development={dev({ builder: { name: 'B' } })} canEdit />);
    await userEvent.type(field('builder.website'), 'https://ok.example.com');
    await save();
    await waitFor(() => expect(errorOf(field('builder.website'))).toHaveTextContent('developments:apiErrors.URL_INVALID'));
  });

  it('checks a picture before uploading it, and uploads a good one', async () => {
    render(<BuilderSection development={dev()} canEdit />);
    const pickers = screen.getAllByLabelText('builder.choose');
    fireEvent.change(pickers[0], { target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByText('developments:apiErrors.IMAGE_TYPE')).toHaveAttribute('role', 'alert');
    expect(h.upload).not.toHaveBeenCalled();
    const png = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });
    fireEvent.change(pickers[0], { target: { files: [png] } });
    await waitFor(() => expect(h.upload).toHaveBeenCalledWith({ kind: 'logo', file: png }));
  });

  it('read-only for roles that cannot edit', () => {
    render(<BuilderSection development={dev({ builder: { name: 'B', logo: { url: 'https://cdn.example.com/l.webp' } } })} canEdit={false} />);
    expect(field('builder.name')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'builder.save' })).toBeNull();
    expect(screen.queryByLabelText('builder.replace')).toBeNull();
  });
});
