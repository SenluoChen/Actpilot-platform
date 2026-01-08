import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_API_BASE_URL || 'https://0d7o8jjv2a.execute-api.eu-west-3.amazonaws.com/prod';

  return {
      resolve: {
        alias: {
   
          react: path.resolve(__dirname, 'node_modules', 'react'),
          'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
          '@emotion/react': path.resolve(__dirname, 'node_modules', '@emotion', 'react'),
          '@emotion/styled': path.resolve(__dirname, 'node_modules', '@emotion', 'styled')
        }
      },
    plugins: [react()],
    server: {
  
      port: 5179,
      strictPort: true,
      open: true,
      hmr: {
        host: 'localhost',
        clientPort: 5179,
      },
      proxy: {
        // Proxy annex API requests to the backend to avoid CORS during local dev.
        '/annex': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/user': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
