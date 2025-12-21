// User API Client
// Handles all user-related API calls

import { httpClient } from './httpClient';

export class UserApiClient {
  async getUserById(id: string): Promise<any> {
    return await httpClient.get(`/users/${id}`);
  }

  async updateUser(id: string, data: any): Promise<any> {
    return await httpClient.put(`/users/${id}`, data, true);
  }

  async getAgents(): Promise<any> {
    return await httpClient.get('/users/agents');
  }

  async getAgentById(id: string): Promise<any> {
    return await httpClient.get(`/users/agents/${id}`);
  }

  async updateAgent(id: string, data: any): Promise<any> {
    return await httpClient.put(`/users/agents/${id}`, data, true);
  }

  async uploadAvatar(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('avatar', file);

    return await httpClient.uploadFile('/users/upload-avatar', formData, true);
  }

  async getSavedSearches(): Promise<any> {
    return await httpClient.get('/users/saved-searches', true);
  }

  async addSavedSearch(data: {
    name: string;
    filters: any;
    drawnBoundsJSON: string | null;
  }): Promise<any> {
    return await httpClient.post('/users/saved-searches', data, true);
  }

  async deleteSavedSearch(searchId: string): Promise<void> {
    await httpClient.delete(`/users/saved-searches/${searchId}`, true);
  }

  async updateSavedSearchAccessTime(searchId: string): Promise<void> {
    await httpClient.patch(`/users/saved-searches/${searchId}/access`, undefined, true);
  }

  async verifyLicense(licenseNumber: string): Promise<any> {
    return await httpClient.post('/users/verify-license', { licenseNumber }, true);
  }

  async getPublicKey(userId: string): Promise<any> {
    return await httpClient.get(`/users/${userId}/public-key`);
  }

  async updatePublicKey(publicKey: string): Promise<any> {
    return await httpClient.put('/users/public-key', { publicKey }, true);
  }
}

export const userApiClient = new UserApiClient();
