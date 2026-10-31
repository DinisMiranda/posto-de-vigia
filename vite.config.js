import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// O site é publicado em https://dinismiranda.github.io/posto-de-vigia/
export default defineConfig({
  base: '/posto-de-vigia/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
});
