// Use Case: Update User Profile
// Single responsibility: Update user profile information

import { User } from '../../entities/User';
import { IUserRepository, UpdateUserDTO } from '../../repositories/IUserRepository';

export class UpdateUserProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, data: UpdateUserDTO): Promise<User> {
    // Business logic validation
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (data.name !== undefined && data.name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    if (data.email !== undefined && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.phone !== undefined && data.phone.length < 10) {
      throw new Error('Invalid phone number');
    }

    if (data.bio !== undefined && data.bio.length > 1000) {
      throw new Error('Bio cannot exceed 1000 characters');
    }

    if (data.yearsOfExperience !== undefined && data.yearsOfExperience < 0) {
      throw new Error('Years of experience cannot be negative');
    }

    // Delegate to repository
    return await this.userRepository.updateUser(userId, data);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
