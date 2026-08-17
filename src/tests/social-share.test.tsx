/**
 * SocialShare Component Tests
 * Tests share button rendering, click handling, copy link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialShare } from '../components/marketing/SocialShare';

describe('SocialShare', () => {
  const defaultProps = {
    url: 'https://balkanestateai.com/agencies/test-agency',
    title: 'Test Agency - Real Estate Agency',
    description: 'A great agency with 10 agents',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Icons Variant (default)', () => {
    it('should render all default platform icons', () => {
      render(<SocialShare {...defaultProps} />);

      // Should render buttons for each platform
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(5); // facebook, twitter, whatsapp, linkedin, email, copy
    });

    it('should open share URL in new window on platform click', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<SocialShare {...defaultProps} platforms={['facebook']} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer'),
        '_blank',
        'width=600,height=400'
      );
    });

    it('should copy URL to clipboard on copy click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<SocialShare {...defaultProps} platforms={['copy']} />);

      const copyButton = screen.getByRole('button');
      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(defaultProps.url);
    });
  });

  describe('Buttons Variant', () => {
    it('should render buttons with platform names', () => {
      render(<SocialShare {...defaultProps} variant="buttons" platforms={['facebook', 'twitter']} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Dropdown Variant', () => {
    it('should render a single trigger button', () => {
      render(<SocialShare {...defaultProps} variant="dropdown" />);

      const triggerButton = screen.getByRole('button');
      expect(triggerButton).toBeInTheDocument();
    });

    it('should show dropdown platforms on click (when native share unavailable)', () => {
      // Ensure navigator.share is not available
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      render(<SocialShare {...defaultProps} variant="dropdown" platforms={['facebook', 'twitter', 'copy']} />);

      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);

      // Dropdown should appear with platform options
      const platformButtons = screen.getAllByRole('button');
      // Trigger + 3 platform buttons
      expect(platformButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should use native share API when available', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        writable: true,
        configurable: true,
      });

      render(<SocialShare {...defaultProps} variant="dropdown" />);

      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);

      expect(shareMock).toHaveBeenCalledWith({
        title: defaultProps.title,
        text: defaultProps.description,
        url: defaultProps.url,
      });
    });
  });

  describe('Platform URL generation', () => {
    it('should encode URL and title for Twitter', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<SocialShare {...defaultProps} platforms={['twitter']} />);
      fireEvent.click(screen.getByRole('button'));

      const call = openSpy.mock.calls[0][0] as string;
      expect(call).toContain('twitter.com/intent/tweet');
      expect(call).toContain(encodeURIComponent(defaultProps.url));
    });

    it('should encode URL for WhatsApp', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<SocialShare {...defaultProps} platforms={['whatsapp']} />);
      fireEvent.click(screen.getByRole('button'));

      const call = openSpy.mock.calls[0][0] as string;
      expect(call).toContain('wa.me');
    });

    it('should create mailto link for email', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<SocialShare {...defaultProps} platforms={['email']} />);
      fireEvent.click(screen.getByRole('button'));

      const call = openSpy.mock.calls[0][0] as string;
      expect(call).toContain('mailto:?subject=');
    });
  });
});
