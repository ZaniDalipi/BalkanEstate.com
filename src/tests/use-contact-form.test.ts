/**
 * useContactForm Hook Tests
 * Tests for contact form state management and validation
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactForm } from '../features/contact/hooks/use-contact-form';

describe('useContactForm', () => {
  it('should initialize with empty form data', () => {
    const { result } = renderHook(() => useContactForm());

    expect(result.current.formData).toEqual({
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  it('should update form data on change', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formData.name).toBe('John Doe');
  });

  it('should clear field error when field changes', () => {
    const { result } = renderHook(() => useContactForm());

    // Trigger validation to create errors
    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    // Should have name error
    expect(result.current.errors.name).toBeDefined();

    // Change name field
    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    // Name error should be cleared
    expect(result.current.errors.name).toBeUndefined();
  });

  it('should validate empty name', () => {
    const { result } = renderHook(() => useContactForm());
    const submitFn = vi.fn();

    act(() => {
      result.current.handleSubmit(submitFn);
    });

    expect(result.current.errors.name).toBeDefined();
    expect(submitFn).not.toHaveBeenCalled();
  });

  it('should validate empty email', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.email).toBeDefined();
  });

  it('should validate invalid email format', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'not-an-email' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.email).toBeDefined();
  });

  it('should validate empty message', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.message).toBeDefined();
  });

  it('should validate short message', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hi' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.message).toContain('at least');
  });

  it('should validate optional phone when provided', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'phone', value: '123' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hello, I have a question about your services.' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.phone).toBeDefined();
  });

  it('should not validate phone when empty (optional)', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hello, I have a question about your services.' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    act(() => {
      result.current.handleSubmit(vi.fn());
    });

    expect(result.current.errors.phone).toBeUndefined();
  });

  it('should call submit function with sanitized data on valid form', async () => {
    const { result } = renderHook(() => useContactForm());
    const submitFn = vi.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hello, I have a question about your real estate services.' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(submitFn);
    });

    expect(submitFn).toHaveBeenCalledTimes(1);
    expect(submitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question about your real estate services.',
      })
    );
  });

  it('should set isSuccess on successful submission', async () => {
    const { result } = renderHook(() => useContactForm());
    const submitFn = vi.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hello, I have a question about your real estate services.' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(submitFn);
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should set submitError on failed submission', async () => {
    const { result } = renderHook(() => useContactForm());
    const submitFn = vi.fn().mockRejectedValue(new Error('Network error'));

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: 'john@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: 'Hello, I have a question about your real estate services.' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(submitFn);
    });

    expect(result.current.submitError).toBe('Network error');
    expect(result.current.isSuccess).toBe(false);
  });

  it('should reset form state', async () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John Doe' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formData.name).toBe('John Doe');

    act(() => {
      result.current.reset();
    });

    expect(result.current.formData.name).toBe('');
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  it('should sanitize form data before submission', async () => {
    const { result } = renderHook(() => useContactForm());
    const submitFn = vi.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: '  John Doe  ' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'email', value: '  JOHN@EXAMPLE.COM  ' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: 'message', value: '  Hello, I need help with my account.  ' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(submitFn);
    });

    expect(submitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I need help with my account.',
      })
    );
  });
});
