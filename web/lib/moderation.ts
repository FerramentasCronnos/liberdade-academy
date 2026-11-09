/**
 * Triagem de publicações e comentários da comunidade.
 *
 * O que fala de reembolso ou fala mal da comunidade não vai direto ao feed:
 * fica em revisão até a equipe aprovar ou recusar. Primeiro uma lista de
 * frases (não regex, para a dona do produto conseguir acrescentar termos sem
 * conhecer a sintaxe); se nenhuma casar, um modelo barato avalia o tom.
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
  // pedidos de dinheiro de volta sem a palavra "reembolso"
  'dinero de vuelta',
  'dinero de regreso',
  'reclamo de dinero',
  'reclamo del dinero',
  'reclamar mi dinero',
  'reclamar el dinero',
  'recuperar mi dinero',
  'recuperar el dinero',
  'quiero mi dinero',
  'derecho de reclamo',
  'derecho a reclamo',
  'derecho a reclamar',
  'garantia',
  'garantía',
  // reclamações que podem virar crise pública: passam pela equipe antes do feed
  'estafa',
  'estafas',
  'estafador',
  'estafadores',
  'estafaron',
  'estafado',
  'estafada',
  'fraude',
  'engaño',
  'engañaron',
  'engañado',
  'engañada',
  'mentira',
  'mentiras',
  'mentirosos',
  'prometieron',
  'denuncia',
  'denunciar',
  'me quitan el acceso',
  'me quitaron el acceso',
  'sin acceso a las clases',
  // falar mal da comunidade, do curso ou da equipe. Só frases inequívocas:
  // "no funciona" e "no sirve" sozinhos são dúvida técnica comum ("el cupón no
  // sirve"), "basura" é nicho de produto ("bote de basura") e "esquema" também
  // quer dizer diagrama. A nuance fica com a triagem por IA.
  'no sirve para nada',
  'el curso no sirve',
  'el programa no sirve',
  'el método no sirve',
  'la comunidad no sirve',
  'no funciona nada',
  'nada funciona',
  'pérdida de tiempo',
  'nadie responde',
  'nadie contesta',
  'nadie me responde',
  'nadie me contesta',
  // "me arrepiento de no haber empezado antes" é depoimento positivo: só a compra
  'me arrepiento de comprar',
  'me arrepiento de haber comprado',
  'me arrepiento de la compra',
  'me arrepiento de haber pagado',
  'me arrepiento de haber entrado',
  'no lo compren',
  'no compren',
  'es humo',
  'vende humo',
  'venden humo',
  'vendehumo',
  'vendehumos',
  'pirámide',
  'esquema piramidal',
  'esquema ponzi',
  'es una basura',
  'son una basura',
  'es basura',
  'pura basura',
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

/* ------------------------------------------------------------ triagem por IA */

/** Prefixo do motivo quando quem segurou foi a IA (fica em reviewNote). */
export const AI_NOTE_PREFIX = 'IA: ';
/** Nota de quando a equipe tira um post do ar manualmente. */
export const HELD_BY_TEAM_NOTE = 'retenida por el equipo';

const DEFAULT_MODERATION_MODEL = 'anthropic/claude-haiku-5.5';
const AI_TIMEOUT_MS = 6000;

export const MODERATION_PROMPT = `Eres el filtro de moderación de la comunidad privada de un curso online de ventas y afiliados (Máquina de Ventas Automáticas, "MVA"). Recibes un texto que un miembro quiere publicar (publicación o comentario), en español o portugués. Decides si debe pasar por revisión del equipo antes de publicarse.

Marca flag=true cuando el texto:
- critica, se queja, se burla o habla mal de la comunidad, el curso/programa/MVA, el método, el equipo, el soporte o los mentores, los productos/catálogo o los resultados que prometen (también con sarcasmo o ironía);
- pide su dinero de vuelta, reembolso, cancelación o garantía, con cualquier palabra;
- amenaza con exponer, denunciar, escrachar o "contar la verdad" en redes;
- intenta llevar a los miembros a otro grupo, curso, mentor o competidor.

Marca flag=false cuando es una duda o pregunta técnica (aunque diga que algo "no funciona" o "no le sirve" un enlace o una herramienta), una frustración con su PROPIO avance sin culpar al programa, una presentación, un resultado, un agradecimiento o cualquier mensaje positivo o neutro.

Ejemplos flag=true:
- "Esto no sirve, llevo 2 meses y nada" -> {"flag": true, "reason": "dice que el programa no sirve"}
- "Nadie responde en el soporte, qué vergüenza" -> {"flag": true, "reason": "critica el soporte"}
- "Perdí mi plata con este curso" -> {"flag": true, "reason": "dice que perdió dinero con el curso"}
- "Uff, qué gran ayuda la del equipo 🙃" -> {"flag": true, "reason": "sarcasmo sobre el equipo"}
- "Si no me responden hoy lo publico en TikTok" -> {"flag": true, "reason": "amenaza con exponer"}
- "Quiero cancelar y que me devuelvan lo que pagué" -> {"flag": true, "reason": "pide cancelación y devolución"}
- "Únanse a mi grupo de Telegram, ahí enseño gratis lo mismo" -> {"flag": true, "reason": "lleva miembros a otro grupo"}
- "Isso aqui é uma perda de tempo" -> {"flag": true, "reason": "dice que es una pérdida de tiempo"}

Ejemplos flag=false:
- "El enlace de Amazon no funciona, ¿alguien sabe por qué?" -> {"flag": false, "reason": "duda técnica"}
- "Estoy frustrada, todavía no hago mi primera venta. ¿Qué me recomiendan?" -> {"flag": false, "reason": "frustración con su propio avance"}
- "¡Primera comisión! Gracias equipo 🙌" -> {"flag": false, "reason": "mensaje positivo"}
- "No encuentro la clase del jueves, ¿dónde está el link?" -> {"flag": false, "reason": "duda"}

Responde SOLO con JSON en una línea, sin texto extra: {"flag": boolean, "reason": string}. "reason" en español, máximo 8 palabras.`;

export type AiVerdict = { flag: boolean; reason: string };

/**
 * Lê a resposta do modelo. Tolerante a cercas de código e texto em volta;
 * qualquer coisa fora do formato devolve null (e quem chama publica normalmente).
 */
export function parseModerationVerdict(raw: string): AiVerdict | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]) as { flag?: unknown; reason?: unknown };
    if (typeof data.flag !== 'boolean') return null;
    const reason = typeof data.reason === 'string' ? data.reason.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
    return { flag: data.flag, reason };
  } catch {
    return null;
  }
}

type ScreenOptions = {
  /** Contexto curto (ex.: título do post comentado) para a IA entender ironia. */
  context?: string;
  /** Injetável nos testes. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Ligada quando há chave do OpenRouter; MODERATION_AI=0 desliga sem deploy de código. */
export function aiScreeningEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY) && process.env.MODERATION_AI !== '0';
}

/**
 * Pergunta ao modelo barato se o texto fala mal da comunidade. Devolve null em
 * qualquer erro, timeout ou resposta inválida: falha aberta, o texto publica.
 */
export async function classifyWithAI(text: string, options: ScreenOptions = {}): Promise<AiVerdict | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_MODERATION_MODEL || DEFAULT_MODERATION_MODEL;
  const doFetch = options.fetchImpl ?? fetch;
  const user = options.context
    ? `Contexto (publicación que se está comentando): ${options.context.slice(0, 300)}\n\nTexto a revisar:\n${text.slice(0, 2000)}`
    : `Texto a revisar:\n${text.slice(0, 2000)}`;

  try {
    const response = await doFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://catalogo.s4accelerator.com',
        'X-Title': 'Máquina de Ventas Automáticas',
      },
      // sem temperature: os modelos novos da Anthropic recusam valores fora do padrão
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: MODERATION_PROMPT },
          { role: 'user', content: user },
        ],
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? AI_TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    const verdict = parseModerationVerdict(raw);
    if (!verdict) console.error('[moderacion] resposta da IA fora do formato, publicando normalmente:', raw.slice(0, 200));
    return verdict;
  } catch (error) {
    console.error('[moderacion] triagem por IA falhou, publicando normalmente', error);
    return null;
  }
}

export type ReviewDecision = { flagged: false } | { flagged: true; term: string; source: 'keyword' | 'ai' };

/**
 * Triagem completa de quem não é da equipe: frase da lista vai direto para
 * revisão (sem chamar a IA); senão a IA decide. Erro da IA = publica.
 * `term` vira o reviewNote: o termo da lista, ou "IA: <motivo>".
 */
export async function screenForReview(text: string, options: ScreenOptions = {}): Promise<ReviewDecision> {
  const keyword = needsReview(text);
  if (keyword.flagged) return { flagged: true, term: keyword.term!, source: 'keyword' };

  // só anexo, ou "ok", "gracias": nada para avaliar
  if (normalize(text ?? '').replace(/[^a-z0-9]/g, '').length < 4) return { flagged: false };
  if (!aiScreeningEnabled()) return { flagged: false };

  const verdict = await classifyWithAI(text, options);
  if (!verdict?.flag) return { flagged: false };
  return { flagged: true, term: `${AI_NOTE_PREFIX}${verdict.reason || 'habla mal de la comunidad'}`.slice(0, 140), source: 'ai' };
}

/** Texto curto do motivo para o painel e o e-mail da equipe. */
export function describeReviewReason(note: string) {
  if (note.startsWith(AI_NOTE_PREFIX)) return note;
  if (note === HELD_BY_TEAM_NOTE) return note;
  return `menciona “${note}”`;
}
