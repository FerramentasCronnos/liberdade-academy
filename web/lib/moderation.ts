/**
 * Triagem de publicações da comunidade.
 *
 * Posts que falam de reembolso não vão direto ao feed: ficam em revisão até
 * a equipe aprovar ou recusar. A lista é de frases, não de regex, para a
 * dona do produto conseguir acrescentar termos sem conhecer a sintaxe.
 */
export const REVIEW_TERMS: string[] = [
  'reembolso',
  'reembolsos',
  'reembolsar',
  'reembolsá',
  'reembolsen',
  'reembolsado',
  'reembolsada',
  'devolución del dinero',
  'devolución de mi dinero',
  'devolver el dinero',
  'devolver mi dinero',
  'devuelvan mi dinero',
  'devuelvan el dinero',
  'me devuelvan',
  'refund',
  'refunds',
  'chargeback',
  'contracargo',
  'estorno',
  'estornar',
  'garantía de 7 días',
  'garantía de siete días',
  'garantía de dinero',
  'garantía del dinero',
  'cancelar la compra',
  'cancelar mi compra',
];

/** Minúsculas, sem acentos e com espaços colapsados: "Reembólso" casa com "reembolso". */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compilado uma vez por termo. `\b` do JS não entende letras acentuadas, mas
// como o texto já está normalizado (sem acento), o limite de palavra funciona.
const PATTERNS = REVIEW_TERMS.map((term) => ({
  term,
  regex: new RegExp(`\\b${escapeRegex(normalize(term))}\\b`, 'i'),
}));

/** Diz se o texto precisa passar pela equipe antes de ser publicado, e por qual termo. */
export function needsReview(text: string): { flagged: boolean; term?: string } {
  const haystack = normalize(text ?? '');
  if (!haystack) return { flagged: false };
  for (const { term, regex } of PATTERNS) {
    if (regex.test(haystack)) return { flagged: true, term };
  }
  return { flagged: false };
}
