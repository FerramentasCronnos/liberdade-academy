/**
 * Links de resgate da presell (Wix) são praticamente senhas: ficam na env, nunca no código nem no banco.
 *
 * BANK_OFFERS_PRESELL_LINKS, BANK_OFFERS_PRESELL_LINKS_2 e BANK_OFFERS_PRESELL_LINKS_3 são JSON {slug: valor}. O valor é:
 * - uma URL (uma presell só), ou
 * - um objeto {rótulo: URL} quando a oferta tem várias presells (ex.: {"DR": "...", "X1": "..."}).
 * Cada env soma com as anteriores e, no mesmo slug, vale a mais nova (_3, depois _2, depois a primeira).
 * As envs secretas da Vercel não podem ser lidas de volta, então presells novas entram numa env nova
 * sem reescrever as outras.
 */
export interface PresellLink {
  /** Tipo de tráfego (DR, X1, Orgánico); vazio quando a oferta tem uma presell só. */
  label: string;
  url: string;
}

function readMap(raw: string | undefined): Record<string, unknown> {
  try {
    const map = JSON.parse(raw || '{}');
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  } catch {
    return {};
  }
}

function toLinks(value: unknown): PresellLink[] {
  if (typeof value === 'string') return value ? [{ label: '', url: value }] : [];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
    .map(([label, url]) => ({ label, url }));
}

export function presellLinks(slug?: string | null): PresellLink[] {
  if (!slug) return [];
  for (const raw of [process.env.BANK_OFFERS_PRESELL_LINKS_3, process.env.BANK_OFFERS_PRESELL_LINKS_2]) {
    const map = readMap(raw);
    if (slug in map) return toLinks(map[slug]);
  }
  return toLinks(readMap(process.env.BANK_OFFERS_PRESELL_LINKS)[slug]);
}
