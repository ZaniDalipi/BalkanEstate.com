// API Configuration

// Get API URL with validation and production fallback
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  let url: string;

  // Only use env variable if it's a valid absolute URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    url = envUrl;
  } else if (typeof window !== 'undefined' && window.location.hostname.includes('balkanestateai.com')) {
    // Production fallback based on hostname
    url = 'https://api.balkanestateai.com/api';
  } else {
    // Development fallback
    url = 'http://localhost:5001/api';
  }

  // Remove trailing slashes to prevent double-slash issues in URL construction
  return url.replace(/\/+$/, '');
};

export const API_URL = getApiUrl();
