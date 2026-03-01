// Agents API module
// Handles all agent-related API calls

import { apiRequest } from '@/src/shared/api';
import type { Agent, User } from '@/src/shared/types';

// --- Transformers ---

export function transformBackendAgent(backendAgent: any): Agent {
  const user = backendAgent.userId || {};
  const userId = typeof user === 'object' && (user.id || user._id) ? (user.id || user._id) : user;
  const agency = backendAgent.agencyId || {};
  const agencyId = typeof agency === 'object' && (agency.id || agency._id) ? (agency.id || agency._id) : agency;

  return {
    id: backendAgent.id || backendAgent._id,
    userId: String(userId),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatarUrl: user.avatarUrl,
    avatarOptions: user.avatarOptions || null,
    gender: user.gender || 'male',
    city: user.city,
    country: user.country,
    address: user.address,
    role: 'agent' as any,
    agencyName: backendAgent.agencyName,
    agencyId: agencyId ? String(agencyId) : undefined,
    agencyLogo: agency.logo,
    agencyGradient: agency.coverGradient,
    agencyCoverImage: agency.coverImage,
    agencySlug: agency.slug,
    agentId: backendAgent.agentId,
    licenseNumber: backendAgent.licenseNumber,
    licenseCountry: backendAgent.licenseCountry,
    licenseVerified: backendAgent.licenseVerified,
    licenseVerificationDate: backendAgent.licenseVerificationDate,
    licenseStatus: backendAgent.licenseStatus || (backendAgent.licenseVerified ? 'verified' : backendAgent.licenseNumber ? 'pending' : 'none'),
    testimonials: backendAgent.testimonials || [],
    rating: backendAgent.rating || 0,
    totalSalesValue: backendAgent.totalSalesValue || 0,
    propertiesSold: backendAgent.totalSales || 0,
    activeListings: backendAgent.activeListings || 0,
    totalReviews: backendAgent.totalReviews || 0,
    isSubscribed: false,
    bio: backendAgent.bio,
    specializations: backendAgent.specializations || [],
    yearsOfExperience: backendAgent.yearsOfExperience,
    languages: backendAgent.languages || [],
    serviceAreas: backendAgent.serviceAreas || [],
    websiteUrl: backendAgent.websiteUrl,
    facebookUrl: backendAgent.facebookUrl,
    instagramUrl: backendAgent.instagramUrl,
    linkedinUrl: backendAgent.linkedinUrl,
    officeAddress: backendAgent.officeAddress,
    officePhone: backendAgent.officePhone,
    lat: backendAgent.lat,
    lng: backendAgent.lng,
  };
}

// --- API Functions ---

export const getAllAgents = async (): Promise<{ agents: Agent[] }> => {
  const response = await apiRequest<{ agents?: any[] }>('/agents');
  if (response.agents) {
    return { agents: response.agents.map(transformBackendAgent) };
  }
  return { agents: [] };
};

export const getAgent = async (agentId: string): Promise<Agent> => {
  const response = await apiRequest<{ agent: any }>(`/agents/${agentId}`);
  return transformBackendAgent(response.agent);
};

export interface AgentDetailsResponse {
  agent: Agent;
  properties: {
    forSale: any[];
    forRent: any[];
    sold: any[];
  };
  stats: {
    totalListings: number;
    activeListings: number;
    totalSales: number;
    averageRating: number;
  } | null;
}

export const getAgentDetails = async (agentId: string): Promise<AgentDetailsResponse> => {
  const response = await apiRequest<{ agent: any }>(`/agents/${agentId}`);
  const agent = transformBackendAgent(response.agent);

  // Return with default empty properties/stats since backend only returns agent
  return {
    agent,
    properties: { forSale: [], forRent: [], sold: [] },
    stats: {
      totalListings: agent.activeListings || 0,
      activeListings: agent.activeListings || 0,
      totalSales: agent.propertiesSold || 0,
      averageRating: agent.rating || 0,
    },
  };
};

export const updateAgentProfile = async (agentData: Partial<Agent>): Promise<Agent> => {
  const response = await apiRequest<{ agent: any }>('/agents/profile', {
    method: 'PUT',
    body: agentData,
    requiresAuth: true,
    encryptResponse: true,
  });
  return transformBackendAgent(response.agent);
};

export const addAgentReview = async (
  agentId: string,
  review: { quote: string; rating: number; propertyId?: string }
): Promise<{ agent: Agent }> => {
  const response = await apiRequest<{ agent?: any }>(`/agents/${agentId}/reviews`, {
    method: 'POST',
    body: review,
    requiresAuth: true,
  });
  return {
    agent: response.agent ? transformBackendAgent(response.agent) : ({} as Agent),
  };
};

export const leaveAgency = async (): Promise<{
  message: string;
  user: { id: string; agencyId: null; agencyName: string };
}> => {
  return apiRequest('/agents/leave-agency', {
    method: 'POST',
    requiresAuth: true,
  });
};

// --- Saved Agents API ---

export const toggleSavedAgent = async (
  agentId: string
): Promise<{ isSaved: boolean; message: string }> => {
  return apiRequest('/saved-agents/toggle', {
    method: 'POST',
    body: { agentId },
    requiresAuth: true,
  });
};

export const getSavedAgents = async (): Promise<Agent[]> => {
  const response = await apiRequest<{ savedAgents: any[] }>('/saved-agents', {
    requiresAuth: true,
  });

  return response.savedAgents
    .filter((saved) => saved.agentId)
    .map((saved) => transformBackendAgent(saved.agentId));
};

export const checkSavedAgent = async (
  agentId: string
): Promise<{ isSaved: boolean }> => {
  return apiRequest(`/saved-agents/check/${agentId}`, {
    requiresAuth: true,
  });
};
