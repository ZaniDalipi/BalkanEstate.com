import { API_URL } from '@/src/shared/api/config';

export interface Credential {
  _id: string;
  type: 'license' | 'certification' | 'award' | 'membership';
  title: string;
  issuer: string;
  issueNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentPublicId?: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const getToken = () => localStorage.getItem('balkan_estate_token');

export const getCredentials = async (): Promise<Credential[]> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/credentials`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' },
  });
  if (!response.ok) throw new Error('Failed to fetch credentials');
  const data = await response.json();
  return data.credentials || [];
};

export const getAgentPublicCredentials = async (agentId: string): Promise<Credential[]> => {
  const response = await fetch(`${API_URL}/credentials/agent/${agentId}`);
  if (!response.ok) throw new Error('Failed to fetch credentials');
  const data = await response.json();
  return data.credentials || [];
};

export const addCredential = async (
  credential: { type: string; title: string; issuer: string; issueNumber?: string; issueDate?: string; expiryDate?: string; isPublic?: boolean },
  documentFile?: File
): Promise<Credential> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('type', credential.type);
  formData.append('title', credential.title);
  formData.append('issuer', credential.issuer);
  if (credential.issueNumber) formData.append('issueNumber', credential.issueNumber);
  if (credential.issueDate) formData.append('issueDate', credential.issueDate);
  if (credential.expiryDate) formData.append('expiryDate', credential.expiryDate);
  if (credential.isPublic !== undefined) formData.append('isPublic', String(credential.isPublic));
  if (documentFile) formData.append('document', documentFile);

  const response = await fetch(`${API_URL}/credentials`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add credential');
  }
  const data = await response.json();
  return data.credential;
};

export const updateCredential = async (
  credentialId: string,
  credential: { title?: string; issuer?: string; issueNumber?: string; issueDate?: string; expiryDate?: string; isPublic?: boolean },
  documentFile?: File
): Promise<Credential> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  if (credential.title) formData.append('title', credential.title);
  if (credential.issuer) formData.append('issuer', credential.issuer);
  if (credential.issueNumber !== undefined) formData.append('issueNumber', credential.issueNumber);
  if (credential.issueDate !== undefined) formData.append('issueDate', credential.issueDate);
  if (credential.expiryDate !== undefined) formData.append('expiryDate', credential.expiryDate);
  if (credential.isPublic !== undefined) formData.append('isPublic', String(credential.isPublic));
  if (documentFile) formData.append('document', documentFile);

  const response = await fetch(`${API_URL}/credentials/${credentialId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update credential');
  }
  const data = await response.json();
  return data.credential;
};

export const deleteCredential = async (credentialId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/credentials/${credentialId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete credential');
  }
};
