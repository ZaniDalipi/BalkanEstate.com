import './src/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
