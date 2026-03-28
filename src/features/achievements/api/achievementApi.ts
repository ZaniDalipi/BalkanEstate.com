import { apiRequest } from '@/src/shared/api';

export interface Achievement {
  id: string;
  type: 'award' | 'certification' | 'milestone' | 'recognition' | 'membership';
  title: string;
  description?: string;
  dateReceived: Date | string;
  expiryDate?: Date | string;
  issuingOrganization: string;
  documentUrl?: string;
  documentPublicId?: string;
  isVerified: boolean;
  verifiedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface AchievementInput {
  type: Achievement['type'];
  title: string;
  description?: string;
  dateReceived: Date | string;
  expiryDate?: Date | string;
  issuingOrganization: string;
  documentUrl?: string;
}

// User (Agent) Achievements

export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const data = await apiRequest<{ achievements: Achievement[] }>(`/achievements/user/${userId}`, {
      requiresAuth: true,
      encryptResponse: true,
    });
    return data.achievements;
  } catch (error: any) {
    // Return empty array for 404 (not found) and 403 (forbidden) - achievements are optional
    if (error?.statusCode === 404 || error?.statusCode === 403) {
      return [];
    }
    // Re-throw other errors
    throw error;
  }
};

export const addUserAchievement = async (achievement: AchievementInput): Promise<Achievement> => {
  const data = await apiRequest<{ achievement: Achievement }>('/achievements/user', {
    method: 'POST',
    body: achievement,
    requiresAuth: true,
    encryptResponse: true,
  });
  return data.achievement;
};

export const updateUserAchievement = async (
  achievementId: string,
  achievement: Partial<AchievementInput>
): Promise<Achievement> => {
  const data = await apiRequest<{ achievement: Achievement }>(`/achievements/user/${achievementId}`, {
    method: 'PUT',
    body: achievement,
    requiresAuth: true,
    encryptResponse: true,
  });
  return data.achievement;
};

export const deleteUserAchievement = async (achievementId: string): Promise<void> => {
  await apiRequest(`/achievements/user/${achievementId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

// Agency Achievements

export const getAgencyAchievements = async (agencyId: string): Promise<Achievement[]> => {
  const data = await apiRequest<{ achievements: Achievement[] }>(`/achievements/agency/${agencyId}`, {
    requiresAuth: true,
    encryptResponse: true,
  });
  return data.achievements;
};

export const addAgencyAchievement = async (
  agencyId: string,
  achievement: AchievementInput
): Promise<Achievement> => {
  const data = await apiRequest<{ achievement: Achievement }>(`/achievements/agency/${agencyId}`, {
    method: 'POST',
    body: achievement,
    requiresAuth: true,
    encryptResponse: true,
  });
  return data.achievement;
};

export const updateAgencyAchievement = async (
  agencyId: string,
  achievementId: string,
  achievement: Partial<AchievementInput>
): Promise<Achievement> => {
  const data = await apiRequest<{ achievement: Achievement }>(`/achievements/agency/${agencyId}/${achievementId}`, {
    method: 'PUT',
    body: achievement,
    requiresAuth: true,
    encryptResponse: true,
  });
  return data.achievement;
};

export const deleteAgencyAchievement = async (
  agencyId: string,
  achievementId: string
): Promise<void> => {
  await apiRequest(`/achievements/agency/${agencyId}/${achievementId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};
