// Domain Repository Interface: IAgencyRepository
// Defines agency data operations contract

import { Agency } from '../entities/Agency';
import { Agent } from '../entities/Agent';

export interface CreateAgencyDTO {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  address?: string;
  website?: string;
  lat?: number;
  lng?: number;
  yearsInBusiness?: number;
  specialties?: string[];
  certifications?: string[];
}

export interface UpdateAgencyDTO extends Partial<CreateAgencyDTO> {
  isFeatured?: boolean;
}

/**
 * Repository interface for agency operations
 */
export interface IAgencyRepository {
  /**
   * Get all agencies
   */
  getAgencies(): Promise<Agency[]>;

  /**
   * Get a single agency by ID
   */
  getAgencyById(id: string): Promise<Agency>;

  /**
   * Get agency by slug
   */
  getAgencyBySlug(slug: string): Promise<Agency>;

  /**
   * Create a new agency
   */
  createAgency(data: CreateAgencyDTO): Promise<Agency>;

  /**
   * Update an existing agency
   */
  updateAgency(id: string, data: UpdateAgencyDTO): Promise<Agency>;

  /**
   * Delete an agency
   */
  deleteAgency(id: string): Promise<void>;

  /**
   * Get agents belonging to an agency
   */
  getAgencyAgents(agencyId: string): Promise<Agent[]>;

  /**
   * Join an agency with invitation code
   */
  joinAgency(userId: string, agencyId: string, invitationCode: string): Promise<void>;

  /**
   * Leave an agency
   */
  leaveAgency(userId: string, agencyId: string): Promise<void>;

  /**
   * Add admin to agency
   */
  addAdmin(agencyId: string, userId: string): Promise<void>;

  /**
   * Remove admin from agency
   */
  removeAdmin(agencyId: string, userId: string): Promise<void>;

  /**
   * Generate new invitation code
   */
  regenerateInvitationCode(agencyId: string): Promise<string>;

  /**
   * Get featured agencies
   */
  getFeaturedAgencies(): Promise<Agency[]>;
}
