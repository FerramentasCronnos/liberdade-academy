/**
 * Taxas de comissão por categoria.
 *
 * Por que isto existe: o scraper de TikTok Shop BR devolve preço, vendas e
 * nota, mas NÃO devolve a taxa de comissão do afiliado — o endpoint de
 * detalhe do produto só funciona nos EUA ("the only region available for
 * TikTok Shop right now is the US").
 *
 * Então a taxa vem de configuração: quem administra pega os percentuais reais
 * no Affiliate Center e preenche COMMISSION_RATES_BR. O valor exibido no app
 * é marcado como ESTIMATIVA, nunca como dado da fonte.
 *
 * Sem configuração, nada é exibido — preferimos campo ausente a número
 * inventado, porque o aluno decide o que vender com base nisso.
 *
 * Formato: COMMISSION_RATES_BR={"beleza":18,"saude":15,"padrao":12}
 */

type RateTable = Record<string, number>;

const CACHE = new Map<string, RateTable | null>();

function parseTable(region: string): RateTable | null {
  const raw = process.env[`COMMISSION_RATES_${region.toUpperCase()}`];
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const table: RateTable = {};

    for (const [key, value] of Object.entries(parsed)) {
      const rate = Number(value);
      // fora de 0–100 é erro de digitação, não taxa
      if (Number.isFinite(rate) && rate > 0 && rate <= 100) {
        table[key.toLowerCase()] = Math.round(rate);
      }
    }
    return Object.keys(table).length ? table : null;
  } catch {
    return null;
  }
}

function tableFor(region: string): RateTable | null {
  const key = region.toUpperCase();
  if (!CACHE.has(key)) CACHE.set(key, parseTable(key));
  return CACHE.get(key) ?? null;
}

/** Percentual estimado para a categoria, ou null se não houver configuração. */
export function estimatedCommission(category: string, region: string): number | null {
  const table = tableFor(region);
  if (!table) return null;
  return table[category.toLowerCase()] ?? table.padrao ?? table.default ?? null;
}

/** Usado em testes e no reload de configuração. */
export function resetCommissionCache() {
  CACHE.clear();
}
