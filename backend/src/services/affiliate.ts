/**
 * Geração de link de afiliado por marketplace.
 *
 * O que dá para fazer sem API:
 *   Amazon — o link é a URL do produto com ?tag=SEU-TAG. É só isso mesmo; a
 *   Product Advertising API serve para buscar DADOS do produto, não para
 *   rastrear a venda. Funciona hoje, com a tag do Associates.
 *
 * O que exige credencial:
 *   Shopee e Mercado Livre — o link rastreável sai do painel de afiliados ou
 *   da API deles. Não existe parâmetro público que credite a comissão, e
 *   inventar um faria o membro divulgar link que não paga.
 */

export type Marketplace = 'amazon' | 'shopee' | 'mercado_livre';

export interface LinkResult {
  affiliateUrl: string;
  marketplace: Marketplace;
}

export class AffiliateError extends Error {
  constructor(
    message: string,
    readonly code: 'NO_ACCOUNT' | 'BAD_URL' | 'NOT_SUPPORTED',
  ) {
    super(message);
  }
}

const HOSTS: Record<Marketplace, string[]> = {
  amazon: ['amazon.com.br', 'amazon.com', 'amzn.to'],
  shopee: ['shopee.com.br', 's.shopee.com.br', 'shope.ee'],
  mercado_livre: ['mercadolivre.com.br', 'mercadolivre.com', 'produto.mercadolivre.com.br'],
};

/** Descobre o marketplace pela URL colada. */
export function detectMarketplace(rawUrl: string): Marketplace | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  for (const [marketplace, hosts] of Object.entries(HOSTS) as Array<[Marketplace, string[]]>) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return marketplace;
  }
  return null;
}

/**
 * Monta o link da Amazon.
 * Remove parâmetros de rastreio de terceiros para a tag não competir com
 * outra atribuição já presente na URL copiada.
 */
function buildAmazonLink(rawUrl: string, tag: string): string {
  const url = new URL(rawUrl);

  for (const param of ['tag', 'ascsubtag', 'linkCode', 'linkId', 'ref_', 'psc', 'smid']) {
    url.searchParams.delete(param);
  }

  url.searchParams.set('tag', tag);
  return url.toString();
}

export function buildAffiliateLink(
  rawUrl: string,
  marketplace: Marketplace,
  account: { publicId?: string | null } | null,
): LinkResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AffiliateError('URL inválida.', 'BAD_URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AffiliateError('URL inválida.', 'BAD_URL');
  }

  if (marketplace === 'amazon') {
    const tag = account?.publicId?.trim();
    if (!tag) {
      throw new AffiliateError(
        'Cadastre sua tag do Amazon Associates para gerar o link.',
        'NO_ACCOUNT',
      );
    }
    return { affiliateUrl: buildAmazonLink(rawUrl, tag), marketplace };
  }

  throw new AffiliateError(
    marketplace === 'shopee'
      ? 'A Shopee só emite link rastreável pelo painel de afiliados ou pela API. Conecte suas credenciais para liberar aqui.'
      : 'O Mercado Livre só emite link rastreável pelo painel de afiliados ou pela API. Conecte suas credenciais para liberar aqui.',
    'NOT_SUPPORTED',
  );
}

/** Marketplaces que já geram link sem credencial de API. */
export const READY_MARKETPLACES: Marketplace[] = ['amazon'];
