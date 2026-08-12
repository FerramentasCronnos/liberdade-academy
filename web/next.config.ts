import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O repo tem lockfile na raiz (app Expo) e aqui. Sem isto o Next elege a
  // raiz errada como workspace e avisa em todo build.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
