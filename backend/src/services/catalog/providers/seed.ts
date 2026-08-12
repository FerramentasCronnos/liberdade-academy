import type { CatalogProvider } from '../types.js';

/**
 * Provider padrão: não busca nada externo.
 * O catálogo fica sendo o que já está no Postgres (seed + o que foi
 * sincronizado antes). É o modo em que o app funciona sem nenhuma chave.
 */
export const seedProvider: CatalogProvider = {
  name: 'seed',
  supportedRegions: ['BR', 'US'],
  isConfigured: () => true,
  missingConfigMessage: () => '',
  async fetchTopProducts() {
    return [];
  },
};
