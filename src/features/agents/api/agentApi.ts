// Agents API module
// Handles all agent-related API calls

import { apiRequest } from '@/src/shared/api';
import type { Agent, User } from '@/src/shared/types';

// --- Transformers ---

export function transformBackendAgent(backendAgent: any): Agent {
  const user = backendAgent.userId || {};
  const userId = typeof user === 'object' && user._id ? user._id : user;
  const agency = backendAgent.agencyId || {};
  const agencyId = typeof agency === 'object' && agency._id ? agency._id : agency;

  return {
    id: backendAgent._id || backendAgent.id,
    userId: String(userId),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatarUrl: user.avatarUrl,
    city: user.city,
    country: user.country,
    role: 'agent' as any,
    agencyName: backendAgent.agencyName,
    agencyId: agencyId ? String(agencyId) : undefined,
    agencyLogo: agency.logo,
    agencyGradient: agency.coverGradient,
    agencyCoverImage: agency.coverImage,
    agencySlug: agency.slug,
    agentId: backendAgent.agentId,
    licenseNumber: backendAgent.licenseNumber,
    licenseVerified: backendAgent.licenseVerified,
    licenseVerificationDate: backendAgent.licenseVerificationDate,
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

export const updateAgentProfile = async (agentData: Partial<Agent>): Promise<Agent> => {
  const response = await apiRequest<{ agent: any }>('/agents/profile', {
    method: 'PUT',
    body: agentData,
    requiresAuth: true,
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
