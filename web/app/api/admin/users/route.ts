import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * Criação de membro pela administração.
 *
 * Existe porque ainda não há tela de cadastro nem gestão de membros: o acesso
 * é dado manualmente. Protegido pelo CRON_SECRET — sem isso qualquer pessoa
 * criaria conta com privilégio de admin.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    isAdmin?: boolean;
  };

  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password || body.password.length < 6) {
    return NextResponse.json(
      { message: 'Informe email y una contraseña de al menos 6 caracteres.' },
      { status: 400 },
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      ...(body.name ? { name: body.name } : {}),
      passwordHash: await bcrypt.hash(body.password, 10),
      isAdmin: Boolean(body.isAdmin),
    },
    create: {
      name: body.name || email.split('@')[0],
      email,
      passwordHash: await bcrypt.hash(body.password, 10),
      isAdmin: Boolean(body.isAdmin),
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
  });
}

/** Lista os membros — para conferir quem é admin. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, isAdmin: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
