// Domain Repository Interface: IUserRepository
// Defines user data operations contract

import { User } from '../entities/User';
import { Agent } from '../entities/Agent';
import { SavedSearch } from '../entities/SavedSearch';

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  bio?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  languages?: string[];
  serviceAreas?: string[];
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  officeAddress?: string;
  officePhone?: string;
}

export interface SavedSearchDTO {
  name: string;
  filters: any;
  drawnBoundsJSON: string | null;
}

/**
 * Repository interface for user operations
 */
export interface IUserRepository {
  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<User>;

  /**
   * Update user profile
   */
  updateUser(id: string, data: UpdateUserDTO): Promise<User>;

  /**
   * Switch user role
   */
  switchRole(userId: string, newRole: string): Promise<User>;

  /**
   * Get all agents
   */
  getAgents(): Promise<Agent[]>;

  /**
   * Get agent by ID
   */
  getAgentById(id: string): Promise<Agent>;

  /**
   * Update agent profile
   */
  updateAgent(id: string, data: UpdateUserDTO): Promise<Agent>;

  /**
   * Upload user avatar
   */
  uploadAvatar(userId: string, file: File): Promise<string>;

  /**
   * Get user's saved searches
   */
  getSavedSearches(userId: string): Promise<SavedSearch[]>;

  /**
   * Add a saved search
   */
  addSavedSearch(userId: string, data: SavedSearchDTO): Promise<SavedSearch>;

  /**
   * Delete a saved search
   */
  deleteSavedSearch(userId: string, searchId: string): Promise<void>;

  /**
   * Update saved search last accessed time
   */
  updateSavedSearchAccessTime(userId: string, searchId: string): Promise<void>;

  /**
   * Verify user's license
   */
  verifyLicense(userId: string, licenseNumber: string): Promise<boolean>;

  /**
   * Get user's public encryption key
   */
  getPublicKey(userId: string): Promise<string | null>;

  /**
   * Update user's public encryption key
   */
  updatePublicKey(userId: string, publicKey: string): Promise<void>;
}
