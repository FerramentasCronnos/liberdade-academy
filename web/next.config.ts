import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O repositório tem lockfile na raiz (app Expo antigo) e aqui. Sem apontar a
  // raiz, o Next elege a errada como workspace e avisa em todo build.
  // process.cwd() em vez de __dirname: o config é carregado como ESM, onde
  // __dirname não existe.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
