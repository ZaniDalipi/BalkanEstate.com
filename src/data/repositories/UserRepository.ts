// User Repository Implementation
// Implements IUserRepository using UserApiClient

import {
  IUserRepository,
  UpdateUserDTO,
  SavedSearchDTO,
} from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Agent } from '../../domain/entities/Agent';
import { SavedSearch } from '../../domain/entities/SavedSearch';
import { userApiClient } from '../api/UserApiClient';
import { UserMapper } from '../mappers/UserMapper';
import { SavedSearchMapper } from '../mappers/SavedSearchMapper';

export class UserRepository implements IUserRepository {
  async getUserById(id: string): Promise<User> {
    const response = await userApiClient.getUserById(id);
    return UserMapper.toDomain(response.user);
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
    const response = await userApiClient.updateUser(id, data);
    return UserMapper.toDomain(response.user);
  }

  async switchRole(userId: string, newRole: string): Promise<User> {
    // This should be handled through AuthRepository/AuthApiClient
    // But keeping for interface compliance
    throw new Error('Use AuthRepository.switchRole instead');
  }

  async getAgents(): Promise<Agent[]> {
    const response = await userApiClient.getAgents();
    return response.agents.map((dto: any) => UserMapper.toAgentDomain(dto));
  }

  async getAgentById(id: string): Promise<Agent> {
    const response = await userApiClient.getAgentById(id);
    return UserMapper.toAgentDomain(response.agent);
  }

  async updateAgent(id: string, data: UpdateUserDTO): Promise<Agent> {
    const response = await userApiClient.updateAgent(id, data);
    return UserMapper.toAgentDomain(response.agent);
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const response = await userApiClient.uploadAvatar(file);
    return response.avatarUrl;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const response = await userApiClient.getSavedSearches();
    return response.savedSearches.map((dto: any) => SavedSearchMapper.toDomain(dto));
  }

  async addSavedSearch(userId: string, data: SavedSearchDTO): Promise<SavedSearch> {
    const response = await userApiClient.addSavedSearch(data);
    return SavedSearchMapper.toDomain(response.savedSearch);
  }

  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    await userApiClient.deleteSavedSearch(searchId);
  }

  async updateSavedSearchAccessTime(userId: string, searchId: string): Promise<void> {
    await userApiClient.updateSavedSearchAccessTime(searchId);
  }

  async verifyLicense(userId: string, licenseNumber: string): Promise<boolean> {
    const response = await userApiClient.verifyLicense(licenseNumber);
    return response.verified || false;
  }

  async getPublicKey(userId: string): Promise<string | null> {
    const response = await userApiClient.getPublicKey(userId);
    return response.publicKey || null;
  }

  async updatePublicKey(userId: string, publicKey: string): Promise<void> {
    await userApiClient.updatePublicKey(publicKey);
  }
}

export const userRepository = new UserRepository();
