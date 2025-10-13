import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/terminal_proj/' : '/',
  plugins: [svelte()],
  server: {
    port: 3000,
  },
}));
