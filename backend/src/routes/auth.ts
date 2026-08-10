import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeUser } from '../lib/serialize.js';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().min(2).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success || !parsed.data.name) {
      return reply.status(400).send({ message: 'Preencha nome, e-mail e senha.' });
    }

    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.status(409).send({ message: 'Já existe uma conta com este e-mail.' });
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
      },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      needsOnboarding: !user.onboardingCompleted,
      user: serializeUser(user),
    };
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'E-mail ou senha inválidos.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (!user) {
      return reply.status(401).send({ message: 'E-mail ou senha inválidos.' });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ message: 'E-mail ou senha inválidos.' });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      needsOnboarding: !user.onboardingCompleted,
      user: serializeUser(user),
    };
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
    });
    return { user: serializeUser(user) };
  });
}
