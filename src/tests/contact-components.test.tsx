/**
 * Contact Components Tests
 * Tests for ContactForm, ContactSuccess, and ContactUsPage components
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactForm from '../features/contact/components/ContactForm';
import ContactSuccess from '../features/contact/components/ContactSuccess';

// Mock AppContext
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: { activeView: 'contact' },
    dispatch: vi.fn(),
  }),
}));

// Mock apiService
vi.mock('@/services/apiService', () => ({
  sendContactInquiry: vi.fn().mockResolvedValue({ message: 'Success', inquiryId: '123' }),
}));

// Mock contact config
vi.mock('@/src/shared/config/contact', () => ({
  CONTACT_CONFIG: {
    email: {
      info: 'info@test.com',
      support: 'support@test.com',
      contact: 'contact@test.com',
      sales: 'sales@test.com',
      privacy: 'privacy@test.com',
      legal: 'legal@test.com',
      refunds: 'refunds@test.com',
    },
    phone: {
      primary: '+389 71 967 915',
      primaryTel: '+38971967915',
    },
    company: {
      name: 'BalkanEstate AI',
      legalName: 'BalkanEstate AI DOOEL',
    },
    social: {
      whatsappNumber: '38971967915',
    },
  },
}));

/**
 * The subjects the form offers, in order. Kept as a list rather than a count so
 * that adding one (e.g. "advertising", for the "Your Ad Here" slots) shows up
 * as a named change here instead of an unexplained number.
 */
const SUBJECT_VALUES = [
  'general',
  'buying',
  'selling',
  'agency',
  'support',
  'partnership',
  'advertising',
];

describe('ContactForm', () => {
  const defaultProps = {
    formData: {
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    },
    errors: {},
    isSubmitting: false,
    submitError: null,
    onChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<ContactForm {...defaultProps} />);

    // i18n mock returns keys, so labels contain the translation key text
    expect(screen.getByLabelText(/contact:form.name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact:form.email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact:form.phone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact:form.subject/)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact:form.message/)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<ContactForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /contact:form.submit/ });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it('should show loading state when submitting', () => {
    render(<ContactForm {...defaultProps} isSubmitting={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/contact:form.sending/)).toBeInTheDocument();
  });

  it('should display validation errors', () => {
    const errors = {
      name: 'Name is required',
      email: 'Invalid email format',
      message: 'Message is required',
    };

    render(<ContactForm {...defaultProps} errors={errors} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();
  });

  it('should display submit error', () => {
    render(
      <ContactForm {...defaultProps} submitError="Failed to send message" />
    );

    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  it('should call onChange when inputs change', () => {
    render(<ContactForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/contact:form.name/);
    fireEvent.change(nameInput, { target: { name: 'name', value: 'John' } });

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should call onSubmit when form is submitted', () => {
    render(<ContactForm {...defaultProps} />);

    const form = screen.getByRole('button', { name: /contact:form.submit/ });
    fireEvent.click(form);

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('should show character count for message', () => {
    render(
      <ContactForm
        {...defaultProps}
        formData={{ ...defaultProps.formData, message: 'Hello' }}
      />
    );

    expect(screen.getByText('5/2000')).toBeInTheDocument();
  });

  it('should render subject options', () => {
    render(<ContactForm {...defaultProps} />);

    const select = screen.getByLabelText(/contact:form.subject/);
    expect(select).toBeInTheDocument();
    // general, buying, selling, agency, support, partnership, advertising
    expect(select.querySelectorAll('option').length).toBe(SUBJECT_VALUES.length);
    expect([...select.querySelectorAll('option')].map(o => o.getAttribute('value')))
      .toEqual(SUBJECT_VALUES);
  });

  it('should have proper aria attributes on invalid fields', () => {
    const errors = { name: 'Name is required' };
    render(<ContactForm {...defaultProps} errors={errors} />);

    const nameInput = screen.getByLabelText(/contact:form.name/);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
  });

  it('should have autocomplete attributes', () => {
    render(<ContactForm {...defaultProps} />);

    expect(screen.getByLabelText(/contact:form.name/)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/contact:form.email/)).toHaveAttribute('autocomplete', 'email');
    // PhoneInput deliberately uses "tel-national" (not "tel") — the field
    // holds only the local/national digits, the dial code is a separate
    // control, so "tel-national" is the correct autofill hint.
    expect(screen.getByLabelText(/contact:form.phone/)).toHaveAttribute('autocomplete', 'tel-national');
  });
});

describe('ContactSuccess', () => {
  it('should render success message', () => {
    const onReset = vi.fn();
    render(<ContactSuccess onReset={onReset} />);

    // i18n returns key, so look for the key
    expect(screen.getByText(/contact:success.title/)).toBeInTheDocument();
    expect(screen.getByText(/contact:success.description/)).toBeInTheDocument();
  });

  it('should render send another button', () => {
    const onReset = vi.fn();
    render(<ContactSuccess onReset={onReset} />);

    const button = screen.getByRole('button', { name: /contact:success.sendAnother/ });
    expect(button).toBeInTheDocument();
  });

  it('should call onReset when button is clicked', () => {
    const onReset = vi.fn();
    render(<ContactSuccess onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /contact:success.sendAnother/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should render success icon', () => {
    const onReset = vi.fn();
    const { container } = render(<ContactSuccess onReset={onReset} />);

    // Check for the SVG checkmark icon
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
