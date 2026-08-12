export type AffiliateMarketplace = 'amazon' | 'shopee' | 'mercado_livre';

export interface AffiliateAccount {
  marketplace: AffiliateMarketplace;
  publicId: string | null;
  hasSecret: boolean;
  connected: boolean;
}

export interface AffiliateLink {
  id: string;
  marketplace: string;
  originalUrl: string;
  affiliateUrl: string;
  title?: string;
  createdAt: string;
}

export const AFFILIATE_MARKETPLACES: Array<{
  id: AffiliateMarketplace;
  label: string;
  color: string;
  /** Como o link é montado — o texto aparece na tela. */
  how: string;
  /** O que o membro precisa cadastrar. */
  field: string;
  placeholder: string;
  panelUrl: string;
}> = [
  {
    id: 'amazon',
    label: 'Amazon',
    color: '#ff9900',
    how: 'Basta a sua tag do Associates: o link é a URL do produto com ?tag=.',
    field: 'Tag do Amazon Associates',
    placeholder: 'seunome-20',
    panelUrl: 'https://associados.amazon.com.br',
  },
  {
    id: 'shopee',
    label: 'Shopee',
    color: '#ee4d2d',
    how: 'A Shopee só emite link rastreável pelo painel ou pela API de afiliados.',
    field: 'App ID da API de afiliados',
    placeholder: 'ainda não integrado',
    panelUrl: 'https://affiliate.shopee.com.br',
  },
  {
    id: 'mercado_livre',
    label: 'Mercado Livre',
    color: '#ffe600',
    how: 'O Mercado Livre só emite link rastreável pelo painel ou pela API de afiliados.',
    field: 'Client ID da aplicação',
    placeholder: 'ainda não integrado',
    panelUrl: 'https://afiliados.mercadolivre.com.br',
  },
];

export const MARKETPLACE_LABEL: Record<string, string> = {
  amazon: 'Amazon',
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
};

export interface OfferTemplate {
  id: string;
  name: string;
  marketplace: string;
  body: string;
  updatedAt: string;
}

/** Variáveis que o membro pode usar no corpo do template. */
export const TEMPLATE_VARS: Array<{ token: string; label: string; sample: string }> = [
  { token: '{{titulo}}', label: 'Título', sample: 'Fone Bluetooth Sem Fio Premium' },
  { token: '{{preco}}', label: 'Preço', sample: 'R$ 89,90' },
  { token: '{{preco_de}}', label: 'Preço de', sample: 'R$ 199,90' },
  { token: '{{desconto}}', label: 'Desconto', sample: '55%' },
  { token: '{{link}}', label: 'Link', sample: 'https://s.shopee.com.br/exemplo' },
  { token: '{{loja}}', label: 'Loja', sample: 'Shopee' },
];

export const DEFAULT_TEMPLATE_BODY = `🔥 OLHA SÓ QUE ACHADO!

🎁 {{titulo}}

😱 {{desconto}} DE DESCONTO
De: {{preco_de}}
✨ Por: {{preco}}

🛒 Compre aqui:
{{link}}

⚠️ Promoção sujeita à alteração de preço e estoque do site`;

/** Troca as variáveis pelos valores informados; o que faltar vira exemplo. */
export function renderTemplate(body: string, values: Record<string, string>) {
  return TEMPLATE_VARS.reduce((text, variable) => {
    const key = variable.token.replace(/[{}]/g, '');
    const value = values[key]?.trim() || variable.sample;
    return text.split(variable.token).join(value);
  }, body);
}
