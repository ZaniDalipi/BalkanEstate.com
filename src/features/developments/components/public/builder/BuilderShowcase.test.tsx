import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BuilderShowcase } from './BuilderShowcase';
import { BuilderByline } from './BuilderByline';
import type { DevelopmentBuilder } from '../../../types';

const builder: DevelopmentBuilder = {
  name: 'Balkan Build Group',
  tagline: 'Building homes in Skopje since 2004',
  about: 'Family company.',
  foundedYear: 2004,
  completedProjects: 18,
  licenseNumber: 'MK-GR-1182',
  website: 'https://www.balkanbuild.example.com',
  email: 'sales@balkanbuild.example.com',
  phone: '+389 2 123 4567',
  socials: { instagram: 'https://instagram.com/bb' },
  banner: { url: 'https://cdn.example.com/banner.webp' },
};

describe('BuilderShowcase', () => {
  it('shows the company, its record and how to reach it', () => {
    render(<BuilderShowcase builder={builder} />);
    expect(screen.getByRole('heading', { name: 'Balkan Build Group' })).toBeInTheDocument();
    expect(screen.getByText('Building homes in Skopje since 2004')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('MK-GR-1182')).toBeInTheDocument();
    const site = screen.getByRole('link', { name: /balkanbuild\.example\.com/ });
    expect(site).toHaveAttribute('href', 'https://www.balkanbuild.example.com/');
    expect(site).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /\+389 2 123 4567/ })).toHaveAttribute('href', 'tel:+38921234567');
    expect(screen.getByRole('link', { name: /builderPublic.email/ })).toHaveAttribute('href', 'mailto:sales@balkanbuild.example.com');
    expect(screen.getByRole('link', { name: /Instagram/ })).toHaveAttribute('target', '_blank');
  });

  it('never turns an unsafe value into a link, and shows nothing without a builder', () => {
    const { rerender, container } = render(<BuilderShowcase builder={{ name: 'B', website: 'javascript:alert(1)' }} />);
    expect(screen.queryByRole('link')).toBeNull();
    rerender(<BuilderShowcase builder={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BuilderByline', () => {
  it('says who builds it and jumps to the builder section', () => {
    const onOpen = vi.fn();
    render(<BuilderByline builder={builder} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Balkan Build Group/ }));
    expect(onOpen).toHaveBeenCalled();
  });
});
