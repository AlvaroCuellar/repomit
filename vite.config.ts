import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: process.env.VERCEL ? { noExternal: true, external: ['pg'] } : undefined
});
