// Polyfill for external scripts that may expect Laravel Ziggy routing
// This prevents "Can't find variable: Ziggy" errors from third-party scripts
declare global {
  interface Window {
    Ziggy?: {
      url: string;
      port: number | null;
      defaults: Record<string, unknown>;
      routes: Record<string, unknown>;
    };
    route?: (name: string, params?: Record<string, unknown>) => string;
  }
}

// Define Ziggy stub before any scripts run
if (typeof window !== 'undefined' && !window.Ziggy) {
  window.Ziggy = {
    url: window.location.origin,
    port: null,
    defaults: {},
    routes: {},
  };
  // Provide a stub route() function that returns the current URL
  window.route = (_name: string, _params?: Record<string, unknown>) => {
    return window.location.href;
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import Tailwind CSS (production build)
import './src/index.css';

// Initialize Sentry for error monitoring (must be first)
import { initSentry } from './src/lib/sentry';
initSentry();

// Suppress console logs in production for security
import { suppressConsoleLogs } from './src/utils/logger';
suppressConsoleLogs();

// Initialize security measures
import { initSecurity } from './src/utils/security';
initSecurity();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
