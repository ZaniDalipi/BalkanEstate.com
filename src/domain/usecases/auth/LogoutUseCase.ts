// Use Case: Logout User
// Single responsibility: Handle user logout

import { IAuthRepository } from '../../repositories/IAuthRepository';

export class LogoutUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(): Promise<void> {
    // Business logic (if any) - e.g., cleanup, analytics
    await this.authRepository.logout();
  }
}
