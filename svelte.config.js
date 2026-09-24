import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: process.env.VERCEL
      ? vercel({ runtime: 'nodejs24.x', regions: ['fra1'], maxDuration: 60 })
      : node()
  }
};

export default config;
