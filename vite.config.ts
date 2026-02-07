import { defineConfig } from 'vite';

export default defineConfig({
  base: '/aquarium/',
  server: {
    open: true,
  },
  build: {
    target: 'esnext',
  },
});
