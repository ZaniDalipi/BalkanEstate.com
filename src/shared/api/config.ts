// API Configuration

// Get API URL with validation and production fallback
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  // Only use env variable if it's a valid absolute URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }

  // Production fallback based on hostname
  if (typeof window !== 'undefined' && window.location.hostname.includes('balkanestateai.com')) {
    return 'https://api.balkanestateai.com/api';
  }

  // Development fallback
  return 'http://localhost:5001/api';
};

export const API_URL = getApiUrl();
