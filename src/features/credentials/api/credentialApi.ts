import { apiRequest, uploadRequest } from '@/src/shared/api';

export interface Credential {
  id: string;
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

export const getCredentials = async (): Promise<Credential[]> => {
  try {
    const data = await apiRequest<{ credentials: Credential[] }>('/credentials', {
      requiresAuth: true,
      encryptResponse: true,
    });
    return data.credentials || [];
  } catch (error: any) {
    // Return empty array for 404 (not found) and 403 (forbidden) - credentials are optional
    if (error?.statusCode === 404 || error?.statusCode === 403) {
      return [];
    }
    // Re-throw other errors
    throw error;
  }
};

export const getAgentPublicCredentials = async (agentId: string): Promise<Credential[]> => {
  try {
    const data = await apiRequest<{ credentials: Credential[] }>(`/credentials/agent/${agentId}`);
    return data.credentials || [];
  } catch (error: any) {
    // Return empty array for 404 (not found) and 403 (forbidden) - credentials are optional
    if (error?.statusCode === 404 || error?.statusCode === 403) {
      return [];
    }
    // Re-throw other errors
    throw error;
  }
};

export const addCredential = async (
  credential: { type: string; title: string; issuer: string; issueNumber?: string; issueDate?: string; expiryDate?: string; isPublic?: boolean },
  documentFile?: File
): Promise<Credential> => {
  const formData = new FormData();
  formData.append('type', credential.type);
  formData.append('title', credential.title);
  formData.append('issuer', credential.issuer);
  if (credential.issueNumber) formData.append('issueNumber', credential.issueNumber);
  if (credential.issueDate) formData.append('issueDate', credential.issueDate);
  if (credential.expiryDate) formData.append('expiryDate', credential.expiryDate);
  if (credential.isPublic !== undefined) formData.append('isPublic', String(credential.isPublic));
  if (documentFile) formData.append('document', documentFile);

  const data = await uploadRequest<{ credential: Credential }>('/credentials', formData);
  return data.credential;
};

export const updateCredential = async (
  credentialId: string,
  credential: { title?: string; issuer?: string; issueNumber?: string; issueDate?: string; expiryDate?: string; isPublic?: boolean },
  documentFile?: File
): Promise<Credential> => {
  const formData = new FormData();
  if (credential.title) formData.append('title', credential.title);
  if (credential.issuer) formData.append('issuer', credential.issuer);
  if (credential.issueNumber !== undefined) formData.append('issueNumber', credential.issueNumber);
  if (credential.issueDate !== undefined) formData.append('issueDate', credential.issueDate);
  if (credential.expiryDate !== undefined) formData.append('expiryDate', credential.expiryDate);
  if (credential.isPublic !== undefined) formData.append('isPublic', String(credential.isPublic));
  if (documentFile) formData.append('document', documentFile);

  const data = await uploadRequest<{ credential: Credential }>(`/credentials/${credentialId}`, formData, 0, 'PUT');
  return data.credential;
};

export const deleteCredential = async (credentialId: string): Promise<void> => {
  await apiRequest(`/credentials/${credentialId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};
