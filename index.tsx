
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Sentry for error monitoring (must be first)
import { initSentry } from './src/lib/sentry';
initSentry();

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
