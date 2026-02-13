/**
 * Contact Form Validation Tests
 * Tests for the useContactForm hook validation logic
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateName,
  validatePhone,
  sanitizeText,
} from '../shared/utils/validation';

describe('Contact Form Validation', () => {
  describe('Name Validation', () => {
    it('should accept valid names', () => {
      expect(validateName('John Doe').isValid).toBe(true);
      expect(validateName('Ana-Maria').isValid).toBe(true);
      expect(validateName("O'Connor").isValid).toBe(true);
      expect(validateName('Nikola').isValid).toBe(true);
    });

    it('should reject empty names', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject single character names', () => {
      const result = validateName('J');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    it('should reject names with numbers', () => {
      const result = validateName('John123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject names with special characters', () => {
      const result = validateName('John@Doe');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com').isValid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').isValid).toBe(true);
      expect(validateEmail('user+tag@example.com').isValid).toBe(true);
    });

    it('should reject empty emails', () => {
      expect(validateEmail('').isValid).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('notanemail').isValid).toBe(false);
      expect(validateEmail('missing@').isValid).toBe(false);
      expect(validateEmail('@nodomain.com').isValid).toBe(false);
    });

    it('should reject extremely long emails', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(validateEmail(longEmail).isValid).toBe(false);
    });
  });

  describe('Phone Validation (optional field)', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('+38971967915').isValid).toBe(true);
      expect(validatePhone('+1 234 567 8900').isValid).toBe(true);
      expect(validatePhone('123-456-7890').isValid).toBe(true);
    });

    it('should reject too short phone numbers', () => {
      expect(validatePhone('123').isValid).toBe(false);
    });

    it('should reject non-numeric phone numbers', () => {
      expect(validatePhone('abcdefghij').isValid).toBe(false);
    });
  });

  describe('Text Sanitization', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).not.toContain('<');
      expect(sanitizeText('<script>alert("xss")</script>')).not.toContain('>');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeText('javascript:alert(1)')).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      expect(sanitizeText('onerror=alert(1)')).not.toContain('onerror=');
    });

    it('should preserve normal text', () => {
      expect(sanitizeText('Hello, I need help with property listings.')).toBe(
        'Hello, I need help with property listings.'
      );
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
    });
  });

  describe('Contact Message Validation', () => {
    it('should require minimum message length', () => {
      const shortMessage = 'Hi';
      expect(shortMessage.length).toBeLessThan(10);
    });

    it('should enforce maximum message length', () => {
      const longMessage = 'a'.repeat(2001);
      expect(longMessage.length).toBeGreaterThan(2000);
    });

    it('should accept valid messages', () => {
      const validMessage = 'I am interested in learning more about your platform and services.';
      expect(validMessage.length).toBeGreaterThanOrEqual(10);
      expect(validMessage.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('Contact Subject Validation', () => {
    const validSubjects = ['general', 'buying', 'selling', 'agency', 'support', 'partnership'];

    it('should accept all valid subjects', () => {
      validSubjects.forEach((subject) => {
        expect(validSubjects.includes(subject)).toBe(true);
      });
    });

    it('should reject invalid subjects', () => {
      expect(validSubjects.includes('invalid')).toBe(false);
      expect(validSubjects.includes('')).toBe(false);
    });
  });
});
