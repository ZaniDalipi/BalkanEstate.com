import { apiRequest } from '@/src/shared/api';

export interface LicenseSubmitData {
  licenseNumber: string;
  country: string;
}

export interface LicenseSubmitResponse {
  message: string;
  licenseStatus: 'pending';
  licenseNumber: string;
  country: string;
}

export interface FormatHintResponse {
  countryCode: string;
  formatHint: string;
  supportedCountries: string[];
}

export const submitLicense = async (data: LicenseSubmitData): Promise<LicenseSubmitResponse> => {
  return apiRequest<LicenseSubmitResponse>('/license/submit', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
};

export const getLicenseFormatHint = async (countryCode: string): Promise<FormatHintResponse> => {
  return apiRequest<FormatHintResponse>(`/license/format-hint/${countryCode}`);
};
