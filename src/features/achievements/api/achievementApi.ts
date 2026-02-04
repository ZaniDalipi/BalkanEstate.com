import { API_URL } from '@/src/shared/api/config';

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
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/achievements/user/${userId}`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch achievements');
  }

  const data = await response.json();
  return data.achievements;
};

export const addUserAchievement = async (achievement: AchievementInput): Promise<Achievement> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(achievement),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add achievement');
  }

  const data = await response.json();
  return data.achievement;
};

export const updateUserAchievement = async (
  achievementId: string,
  achievement: Partial<AchievementInput>
): Promise<Achievement> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/user/${achievementId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(achievement),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update achievement');
  }

  const data = await response.json();
  return data.achievement;
};

export const deleteUserAchievement = async (achievementId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/user/${achievementId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete achievement');
  }
};

// Agency Achievements

export const getAgencyAchievements = async (agencyId: string): Promise<Achievement[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/achievements/agency/${agencyId}`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch agency achievements');
  }

  const data = await response.json();
  return data.achievements;
};

export const addAgencyAchievement = async (
  agencyId: string,
  achievement: AchievementInput
): Promise<Achievement> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/agency/${agencyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(achievement),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add agency achievement');
  }

  const data = await response.json();
  return data.achievement;
};

export const updateAgencyAchievement = async (
  agencyId: string,
  achievementId: string,
  achievement: Partial<AchievementInput>
): Promise<Achievement> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/agency/${agencyId}/${achievementId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(achievement),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update agency achievement');
  }

  const data = await response.json();
  return data.achievement;
};

export const deleteAgencyAchievement = async (
  agencyId: string,
  achievementId: string
): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/achievements/agency/${agencyId}/${achievementId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete agency achievement');
  }
};
