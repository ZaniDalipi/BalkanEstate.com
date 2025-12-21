/**
 * Password Validation Utility
 *
 * Security Requirements:
 * - Minimum 8 characters (real security, not tutorial 6 chars)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 * - No common/weak passwords
 */

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  'password', 'Password1', 'Password123', '12345678', 'qwerty',
  'abc123', 'password1', 'letmein', 'welcome', 'monkey',
  '1q2w3e4r', 'qwertyuiop', 'admin', 'root', 'user',
  'passw0rd', 'p@ssword', 'p@ssw0rd'
];

/**
 * Validate password strength and security requirements
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length (prevent DoS via bcrypt)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for digit
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords (case insensitive)
  const commonMatch = COMMON_PASSWORDS.find(weak => password.toLowerCase().includes(weak.toLowerCase()));
  if (commonMatch) {
    errors.push(`Password contains a common pattern "${commonMatch}". Please avoid common words and phrases`);
  }

  // Check for sequential characters (e.g., "123", "abc")
  const sequentialMatch = findSequentialCharacters(password);
  if (sequentialMatch) {
    errors.push(`Password contains sequential characters "${sequentialMatch}". Avoid sequences like 123, abc, or qwe`);
  }

  // Calculate password strength
  const strength = calculatePasswordStrength(password);

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

/**
 * Check for sequential characters in password and return the first match found
 */
const findSequentialCharacters = (password: string): string | null => {
  const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 2; i++) {
      const subseq = seq.substring(i, i + 3);
      if (password.toLowerCase().includes(subseq)) {
        return subseq;
      }
    }
  }

  return null;
};

/**
 * Calculate password strength based on entropy and complexity
 */
const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Mixed case and variety bonus
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Determine strength
  if (score <= 4) return 'weak';
  if (score <= 7) return 'medium';
  return 'strong';
};

/**
 * Validate password match
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * Check if password contains user information (prevents weak personalized passwords)
 */
export const passwordContainsUserInfo = (password: string, userInfo: string[]): boolean => {
  const lowerPassword = password.toLowerCase();

  for (const info of userInfo) {
    if (info && info.length >= 3 && lowerPassword.includes(info.toLowerCase())) {
      return true;
    }
  }

  return false;
};
