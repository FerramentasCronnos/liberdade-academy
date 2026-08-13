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
    how: 'Basta tu tag de Associates: el enlace es la URL del producto con ?tag=.',
    field: 'Tag de Amazon Associates',
    placeholder: 'seunome-20',
    panelUrl: 'https://associados.amazon.com.br',
  },
  {
    id: 'shopee',
    label: 'Shopee',
    color: '#ee4d2d',
    how: 'Shopee solo emite enlace rastreable desde el panel o la API de afiliados.',
    field: 'App ID de la API de afiliados',
    placeholder: 'aún no integrado',
    panelUrl: 'https://affiliate.shopee.com.br',
  },
  {
    id: 'mercado_livre',
    label: 'Mercado Libre',
    color: '#ffe600',
    how: 'Mercado Libre solo emite enlace rastreable desde el panel o la API de afiliados.',
    field: 'Client ID de la aplicación',
    placeholder: 'aún no integrado',
    panelUrl: 'https://afiliados.mercadolivre.com.br',
  },
];

export const MARKETPLACE_LABEL: Record<string, string> = {
  amazon: 'Amazon',
  shopee: 'Shopee',
  mercado_livre: 'Mercado Libre',
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
  { token: '{{titulo}}', label: 'Título', sample: 'Audífonos Bluetooth Premium' },
  { token: '{{preco}}', label: 'Precio', sample: 'R$ 89,90' },
  { token: '{{preco_de}}', label: 'Precio antes', sample: 'R$ 199,90' },
  { token: '{{desconto}}', label: 'Descuento', sample: '55%' },
  { token: '{{link}}', label: 'Link', sample: 'https://s.shopee.com.br/exemplo' },
  { token: '{{loja}}', label: 'Tienda', sample: 'Shopee' },
];

export const DEFAULT_TEMPLATE_BODY = `🔥 ¡MIRA ESTE HALLAZGO!

🎁 {{titulo}}

😱 {{desconto}} DE DESCUENTO
Antes: {{preco_de}}
✨ Ahora: {{preco}}

🛒 Compra aquí:
{{link}}

⚠️ Promoción sujeta a cambios de precio y stock en el sitio`;

/** Troca as variáveis pelos valores informados; o que faltar vira exemplo. */
export function renderTemplate(body: string, values: Record<string, string>) {
  return TEMPLATE_VARS.reduce((text, variable) => {
    const key = variable.token.replace(/[{}]/g, '');
    const value = values[key]?.trim() || variable.sample;
    return text.split(variable.token).join(value);
  }, body);
}
