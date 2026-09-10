import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * Popula a comunidade com depoimentos de demonstração.
 *
 * Um feed vazio não convida ninguém a publicar. Enquanto os membros reais
 * não engrenam, estes perfis e posts dão o tom. São contas sem senha
 * conhecida (ninguém entra com elas) e ficam num domínio próprio para o
 * DELETE limpar tudo de uma vez quando não forem mais necessárias.
 *
 * Idempotente: rodar de novo não duplica nada. Protegido pelo CRON_SECRET,
 * como as demais rotas de administração.
 */
export const maxDuration = 300;

const DEMO_DOMAIN = 'demo.liberdade.academy';

interface DemoMember {
  slug: string;
  name: string;
  /** Retrato de exemplo; é copiado para o Blob e não aponta para a origem. */
  photo: string;
  level: number;
  xp: number;
  niche: string;
}

const MEMBERS: DemoMember[] = [
  { slug: 'valentina', name: 'Valentina Ríos', photo: 'https://randomuser.me/api/portraits/women/44.jpg', level: 4, xp: 860, niche: 'beleza' },
  { slug: 'camila', name: 'Camila Torres', photo: 'https://randomuser.me/api/portraits/women/68.jpg', level: 3, xp: 540, niche: 'saude' },
  { slug: 'mariana', name: 'Mariana López', photo: 'https://randomuser.me/api/portraits/women/12.jpg', level: 5, xp: 1240, niche: 'beleza' },
  { slug: 'sofia', name: 'Sofía Herrera', photo: 'https://randomuser.me/api/portraits/women/25.jpg', level: 2, xp: 310, niche: 'casa' },
  { slug: 'lucia', name: 'Lucía Martínez', photo: 'https://randomuser.me/api/portraits/women/57.jpg', level: 3, xp: 620, niche: 'fitness' },
  { slug: 'daniela', name: 'Daniela Castro', photo: 'https://randomuser.me/api/portraits/women/33.jpg', level: 2, xp: 280, niche: 'beleza' },
  { slug: 'andres', name: 'Andrés Molina', photo: 'https://randomuser.me/api/portraits/men/32.jpg', level: 4, xp: 910, niche: 'tecnologia' },
  { slug: 'julian', name: 'Julián Pereira', photo: 'https://randomuser.me/api/portraits/men/75.jpg', level: 1, xp: 140, niche: 'fitness' },
];

interface DemoPost {
  author: string;
  category: 'dica' | 'resultado' | 'duvida' | 'motivacao';
  content: string;
  /** Dias atrás. Espalha o feed para não parecer que tudo nasceu no mesmo minuto. */
  daysAgo: number;
  likes: string[];
  comments?: Array<{ author: string; content: string }>;
}

const POSTS: DemoPost[] = [
  {
    author: 'mariana',
    category: 'resultado',
    content:
      'Cerré el mes con USD 1.870 en comisiones solo con TikTok Shop. Hace 90 días no sabía ni qué era un link de afiliado. Lo que cambió todo: dejar de probar 20 productos y enfocarme en 3 del catálogo que ya estaban validados. 🙌',
    daysAgo: 1,
    likes: ['valentina', 'camila', 'sofia', 'lucia', 'andres', 'daniela'],
    comments: [
      { author: 'sofia', content: '¿Cuáles fueron los 3? Yo sigo perdida entre tantas opciones 😅' },
      { author: 'mariana', content: 'Los del nicho beleza que aparecen como virales. Empieza por los que tienen más ventas y menos competencia en tu país.' },
    ],
  },
  {
    author: 'valentina',
    category: 'dica',
    content:
      'Consejo que me hubiera ahorrado semanas: graba el video mostrando el problema ANTES del producto. Los primeros 2 segundos deciden todo. Mis videos que empiezan con "esto me pasaba todos los días..." tienen el triple de retención.',
    daysAgo: 2,
    likes: ['mariana', 'camila', 'lucia', 'julian', 'daniela'],
    comments: [{ author: 'lucia', content: 'Probé esto ayer y ya se nota en el promedio de visualización. Gracias!' }],
  },
  {
    author: 'andres',
    category: 'resultado',
    content:
      'Primera venta con la página de presell de la plataforma. Tardé 20 minutos en armarla y ya convirtió mejor que mandar el link directo. La gente confía más cuando ve una página con tu cara y tu recomendación.',
    daysAgo: 3,
    likes: ['valentina', 'mariana', 'sofia', 'julian'],
  },
  {
    author: 'camila',
    category: 'motivacao',
    content:
      'Hace 6 meses estaba con dos trabajos y sin tiempo para nada. Hoy hago esto desde casa, con mis horarios. No es magia: son 1 o 2 videos por día, todos los días. Si estás empezando, no te compares con nadie. Compárate con la versión tuya de hace un mes. 💪',
    daysAgo: 4,
    likes: ['valentina', 'mariana', 'sofia', 'lucia', 'daniela', 'andres', 'julian'],
    comments: [{ author: 'daniela', content: 'Necesitaba leer esto hoy 🥹' }],
  },
  {
    author: 'sofia',
    category: 'duvida',
    content:
      '¿Alguien más tuvo problemas con la aprobación de la cuenta de afiliado en TikTok Shop? Me pidieron 1.000 seguidores y todavía estoy en 640. ¿Mientras tanto conviene ir con Shopee?',
    daysAgo: 5,
    likes: ['julian', 'daniela'],
    comments: [
      { author: 'andres', content: 'Sí, empieza con Shopee mientras llegas a los 1.000. Yo hice lo mismo y no perdí el tiempo.' },
      { author: 'valentina', content: 'Publica todos los días con los productos del catálogo, los 1.000 llegan rápido cuando un video pega.' },
    ],
  },
  {
    author: 'lucia',
    category: 'resultado',
    content:
      'Semana récord: 47 ventas de un solo producto de fitness. El video que pegó lo grabé con el celular apoyado en una taza, sin luz especial ni nada. El producto y el gancho importan mucho más que la producción.',
    daysAgo: 7,
    likes: ['mariana', 'camila', 'andres', 'julian', 'valentina'],
  },
  {
    author: 'daniela',
    category: 'dica',
    content:
      'Para las que están en beleza: usen las plantillas de mensaje de la plataforma para WhatsApp. Yo mando el mismo texto a mi lista cada vez que sube un producto viral nuevo y siempre caen 2 o 3 ventas sin grabar nada.',
    daysAgo: 9,
    likes: ['sofia', 'mariana', 'lucia'],
  },
  {
    author: 'julian',
    category: 'resultado',
    content:
      'Mi primera comisión: USD 12,40. Sé que es poco, pero es la prueba de que funciona. Ahora sí sé por qué tanta gente insiste en no rendirse en las primeras semanas.',
    daysAgo: 11,
    likes: ['valentina', 'camila', 'mariana', 'sofia', 'lucia', 'daniela', 'andres'],
    comments: [
      { author: 'camila', content: 'La primera es la más difícil. Felicitaciones! 🎉' },
      { author: 'mariana', content: 'De 12 a 1.000 el camino es el mismo: constancia. Vas bien.' },
    ],
  },
  {
    author: 'valentina',
    category: 'motivacao',
    content:
      'Hoy cumplí un año en esto. Empecé sin audiencia, sin experiencia y con mucho miedo a mostrarme en cámara. Lo que más agradezco no es el ingreso, es la libertad de elegir cómo paso mis días. Sigan. Vale la pena.',
    daysAgo: 14,
    likes: ['mariana', 'camila', 'sofia', 'lucia', 'daniela', 'julian'],
  },
  {
    author: 'andres',
    category: 'dica',
    content:
      'Revisen el ranking del catálogo todos los lunes. Los productos que suben de posición esa semana son los que todavía no están saturados. Llegar 2 semanas antes que el resto hace toda la diferencia en la comisión.',
    daysAgo: 18,
    likes: ['mariana', 'lucia', 'julian'],
  },
];

function emailFor(slug: string) {
  return `${slug}@${DEMO_DOMAIN}`;
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

/** Copia o retrato para o Blob; se não der, usa a origem para não travar o seed. */
async function storePhoto(slug: string, url: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await put(`demo/avatars/${slug}.jpg`, await response.blob(), {
      access: 'public',
      contentType: 'image/jpeg',
      allowOverwrite: true,
    });
    return blob.url;
  } catch {
    return url;
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const ids: Record<string, string> = {};
  const report = { members: 0, posts: 0, likes: 0, comments: 0, skippedPosts: 0 };

  for (const member of MEMBERS) {
    const email = emailFor(member.slug);
    const avatar = await storePhoto(member.slug, member.photo);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: member.name, avatar, level: member.level, xp: member.xp, niche: member.niche },
      create: {
        name: member.name,
        email,
        // senha aleatória e descartada: ninguém entra com estas contas
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
        avatar,
        level: member.level,
        xp: member.xp,
        niche: member.niche,
        onboardingCompleted: true,
        alreadySelling: true,
        joinedAt: new Date(Date.now() - (30 + member.xp / 20) * 86_400_000),
      },
    });
    ids[member.slug] = user.id;
    report.members += 1;
  }

  for (const item of POSTS) {
    const authorId = ids[item.author];
    const exists = await prisma.post.findFirst({
      where: { authorId, content: item.content },
      select: { id: true },
    });
    if (exists) {
      report.skippedPosts += 1;
      continue;
    }

    const createdAt = new Date(Date.now() - item.daysAgo * 86_400_000 - Math.floor(Math.random() * 6) * 3_600_000);
    const post = await prisma.post.create({
      data: { content: item.content, category: item.category, authorId, createdAt },
    });
    report.posts += 1;

    for (const slug of item.likes) {
      await prisma.postLike.create({ data: { postId: post.id, userId: ids[slug] } });
      report.likes += 1;
    }

    let offset = 1;
    for (const comment of item.comments ?? []) {
      await prisma.comment.create({
        data: {
          content: comment.content,
          postId: post.id,
          authorId: ids[comment.author],
          createdAt: new Date(createdAt.getTime() + offset * 47 * 60_000),
        },
      });
      offset += 1;
      report.comments += 1;
    }
  }

  // contador do perfil bate com o feed
  for (const id of Object.values(ids)) {
    const count = await prisma.post.count({ where: { authorId: id } });
    await prisma.user.update({ where: { id }, data: { communityPosts: count } });
  }

  return NextResponse.json({ ok: true, ...report });
}

/** Remove todos os perfis de demonstração; posts, curtidas e comentários vão junto (cascade). */
export async function DELETE(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const removed = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
  });

  return NextResponse.json({ ok: true, removed: removed.count });
}
