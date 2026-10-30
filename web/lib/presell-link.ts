/**
 * Links de resgate da presell (Wix) são praticamente senhas: ficam na env
 * BANK_OFFERS_PRESELL_LINKS como JSON {slug: url}, nunca no código nem no banco.
 */
export function presellLink(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  try {
    const map = JSON.parse(process.env.BANK_OFFERS_PRESELL_LINKS || '{}') as Record<string, string>;
    return map[slug];
  } catch {
    return undefined;
  }
}
