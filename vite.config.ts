import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [
    'localhost',
    '127.0.0.1',
    'nebuly-aiyana-unwaving.ngrok-free.dev',
    'https://nebuly-aiyana-unwaving.ngrok-free.dev',
    'https://nebuly-aiyana-unwaving.ngrok-free.dev'

  ],
        proxy: {
          '/api': {
            target: 'http://localhost:5001',
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: 'http://localhost:5001',
            changeOrigin: true,
            secure: false,
            ws: true,
          },
         
        },
        
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      
    };
});
