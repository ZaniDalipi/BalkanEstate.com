// Use Case: Sign Up New User
// Single responsibility: Handle user registration

import { IAuthRepository, SignupData, AuthResponse } from '../../repositories/IAuthRepository';

export class SignupUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(data: SignupData): Promise<AuthResponse> {
    // Business logic validation
    if (!data.name || !data.email || !data.password || !data.phone) {
      throw new Error('All fields are required');
    }

    if (data.name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!this.isValidPhone(data.phone)) {
      throw new Error('Invalid phone number format');
    }

    if (!this.isValidRole(data.role)) {
      throw new Error('Invalid user role');
    }

    // Delegate to repository
    return await this.authRepository.signup(data);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Simple phone validation - can be enhanced
    return phone.length >= 10;
  }

  private isValidRole(role: string): boolean {
    const validRoles = ['buyer', 'private_seller', 'agent'];
    return validRoles.includes(role);
  }
}
