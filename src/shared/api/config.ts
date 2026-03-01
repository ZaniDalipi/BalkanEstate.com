// API Configuration

const isProduction =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('balkanestateai.com');

// Get API URL with validation and production fallback
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  let url: string;

  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    // In production, reject plain HTTP to prevent accidental insecure connections
    if (isProduction && envUrl.startsWith('http://')) {
      console.error('[API Config] Refusing insecure HTTP API URL in production. Falling back to HTTPS.');
      url = 'https://api.balkanestateai.com/api';
    } else {
      url = envUrl;
    }
  } else if (isProduction) {
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
