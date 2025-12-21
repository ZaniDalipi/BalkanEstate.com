// Agency Repository Implementation
// Implements IAgencyRepository using AgencyApiClient

import {
  IAgencyRepository,
  CreateAgencyDTO,
  UpdateAgencyDTO,
} from '../../domain/repositories/IAgencyRepository';
import { Agency } from '../../domain/entities/Agency';
import { Agent } from '../../domain/entities/Agent';
import { agencyApiClient } from '../api/AgencyApiClient';
import { AgencyMapper } from '../mappers/AgencyMapper';
import { UserMapper } from '../mappers/UserMapper';

export class AgencyRepository implements IAgencyRepository {
  async getAgencies(): Promise<Agency[]> {
    const response = await agencyApiClient.getAgencies();
    return response.agencies.map((dto: any) => AgencyMapper.toDomain(dto));
  }

  async getAgencyById(id: string): Promise<Agency> {
    const response = await agencyApiClient.getAgencyById(id);
    return AgencyMapper.toDomain(response.agency);
  }

  async getAgencyBySlug(slug: string): Promise<Agency> {
    const response = await agencyApiClient.getAgencyBySlug(slug);
    return AgencyMapper.toDomain(response.agency);
  }

  async createAgency(data: CreateAgencyDTO): Promise<Agency> {
    const response = await agencyApiClient.createAgency(data);
    return AgencyMapper.toDomain(response.agency);
  }

  async updateAgency(id: string, data: UpdateAgencyDTO): Promise<Agency> {
    const response = await agencyApiClient.updateAgency(id, data);
    return AgencyMapper.toDomain(response.agency);
  }

  async deleteAgency(id: string): Promise<void> {
    await agencyApiClient.deleteAgency(id);
  }

  async getAgencyAgents(agencyId: string): Promise<Agent[]> {
    const response = await agencyApiClient.getAgencyAgents(agencyId);
    return response.agents.map((dto: any) => UserMapper.toAgentDomain(dto));
  }

  async joinAgency(userId: string, agencyId: string, invitationCode: string): Promise<void> {
    await agencyApiClient.joinAgency(agencyId, invitationCode);
  }

  async leaveAgency(userId: string, agencyId: string): Promise<void> {
    await agencyApiClient.leaveAgency(agencyId);
  }

  async addAdmin(agencyId: string, userId: string): Promise<void> {
    await agencyApiClient.addAdmin(agencyId, userId);
  }

  async removeAdmin(agencyId: string, userId: string): Promise<void> {
    await agencyApiClient.removeAdmin(agencyId, userId);
  }

  async regenerateInvitationCode(agencyId: string): Promise<string> {
    const response = await agencyApiClient.regenerateInvitationCode(agencyId);
    return response.invitationCode;
  }

  async getFeaturedAgencies(): Promise<Agency[]> {
    const response = await agencyApiClient.getFeaturedAgencies();
    return response.agencies.map((dto: any) => AgencyMapper.toDomain(dto));
  }
}

export const agencyRepository = new AgencyRepository();
