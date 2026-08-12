import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';

/**
 * Upload de imagens (foto de perfil e foto de post).
 *
 * Grava em disco, num volume do compose. É o suficiente para uma instância; se
 * um dia a API rodar replicada, troque por S3/R2 mantendo esta mesma rota.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export async function uploadRoutes(app: FastifyInstance) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  app.post('/uploads', { preHandler: [app.authenticate] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ message: 'Envie um arquivo.' });

    const ext = ALLOWED.get(file.mimetype);
    if (!ext) {
      return reply
        .status(415)
        .send({ message: 'Formato não suportado. Use JPG, PNG, WEBP ou GIF.' });
    }

    // nome aleatório: evita colisão e impede que o nome original vire caminho
    const filename = `${randomUUID()}${ext || extname(file.filename) || '.jpg'}`;

    try {
      await pipeline(file.file, createWriteStream(join(UPLOAD_DIR, filename)));
    } catch {
      return reply.status(500).send({ message: 'Falha ao gravar o arquivo.' });
    }

    // truncated = passou do limite configurado no multipart
    if (file.file.truncated) {
      return reply.status(413).send({ message: 'Imagem muito grande (máx. 5 MB).' });
    }

    const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    return { url: `${base}/uploads/${filename}`, path: `/uploads/${filename}` };
  });
}
