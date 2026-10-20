import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5173, strictPort: true, proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
    '/oauth2': { target: 'http://localhost:8080', changeOrigin: true },
    '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: true }
  } },
  preview: { port: 4173 }
});
