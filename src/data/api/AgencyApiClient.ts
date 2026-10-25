// Agency API Client
// Handles all agency-related API calls

import { httpClient } from './httpClient';

export class AgencyApiClient {
  async getAgencies(): Promise<any> {
    return await httpClient.get('/agencies');
  }

  async getAgencyById(id: string): Promise<any> {
    return await httpClient.get(`/agencies/${id}`);
  }

  async getAgencyBySlug(slug: string): Promise<any> {
    return await httpClient.get(`/agencies/slug/${slug}`);
  }

  async createAgency(data: any): Promise<any> {
    return await httpClient.post('/agencies', data, true);
  }

  async updateAgency(id: string, data: any): Promise<any> {
    return await httpClient.put(`/agencies/${id}`, data, true);
  }

  async deleteAgency(id: string): Promise<void> {
    await httpClient.delete(`/agencies/${id}`, true);
  }

  async getAgencyAgents(agencyId: string): Promise<any> {
    return await httpClient.get(`/agencies/${agencyId}/agents`);
  }

  async joinAgency(agencyId: string, invitationCode: string): Promise<any> {
    return await httpClient.post(`/agencies/${agencyId}/join`, { invitationCode }, true);
  }

  async leaveAgency(agencyId: string): Promise<void> {
    await httpClient.post(`/agencies/${agencyId}/leave`, undefined, true);
  }

  async addAdmin(agencyId: string, userId: string): Promise<any> {
    return await httpClient.post(`/agencies/${agencyId}/admins`, { userId }, true);
  }

  async removeAdmin(agencyId: string, userId: string): Promise<void> {
    await httpClient.delete(`/agencies/${agencyId}/admins/${userId}`, true);
  }

  async regenerateInvitationCode(agencyId: string): Promise<any> {
    return await httpClient.post(`/agencies/${agencyId}/regenerate-code`, undefined, true);
  }

  async getFeaturedAgencies(): Promise<any> {
    return await httpClient.get('/agencies/featured');
  }
}

export const agencyApiClient = new AgencyApiClient();
