import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { productRoutes } from './routes/products.js';
import { postRoutes } from './routes/posts.js';
import { rankingRoutes } from './routes/ranking.js';
import { sellingRoutes } from './routes/selling.js';
import { notificationRoutes } from './routes/notifications.js';
import { uploadRoutes, UPLOAD_DIR } from './routes/uploads.js';
import { missionRoutes } from './routes/missions.js';
import { rewardRoutes } from './routes/rewards.js';
import { prisma } from './lib/prisma.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// imagens enviadas ficam em disco e são servidas direto pela API
await app.register(fastifyStatic, {
  root: UPLOAD_DIR,
  prefix: '/uploads/',
  decorateReply: false,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'liberdade-academy-dev-secret-change-me',
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: 'Não autenticado.' });
  }
});

app.get('/health', async () => ({
  ok: true,
  service: 'liberdade-academy-api',
  time: new Date().toISOString(),
}));

await app.register(authRoutes);
await app.register(userRoutes);
await app.register(productRoutes);
await app.register(postRoutes);
await app.register(rankingRoutes);
await app.register(sellingRoutes);
await app.register(notificationRoutes);
await app.register(uploadRoutes);
await app.register(missionRoutes);
await app.register(rewardRoutes);

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

try {
  await prisma.$connect();
  await app.listen({ port, host });
  app.log.info(`API ouvindo em http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
