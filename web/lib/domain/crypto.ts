import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Cifra de credenciais em repouso (AES-256-GCM).
 *
 * Vale para o "secret" das contas de afiliado: se alguém obtiver um dump do
 * banco, não sai chave de API em texto puro. A chave vem de CREDENTIALS_KEY;
 * sem ela a aplicação recusa gravar segredo, em vez de gravar em claro.
 */

const ALGO = 'aes-256-gcm';

function key() {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw || raw.length < 16) return null;
  // deriva 32 bytes de qualquer string suficientemente longa
  return createHash('sha256').update(raw).digest();
}

export function canEncrypt() {
  return key() !== null;
}

export function encrypt(plain: string): string {
  const k = key();
  if (!k) throw new Error('CREDENTIALS_KEY no está configurada.');

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, k, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv.tag.payload — tudo em base64url, numa string só
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(
    '.',
  );
}

export function decrypt(payload: string): string | null {
  const k = key();
  if (!k) return null;

  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) return null;

  try {
    const decipher = createDecipheriv(ALGO, k, Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // chave trocada ou dado corrompido
    return null;
  }
}
