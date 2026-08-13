import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostCard } from '@/components/post-card';
import { Avatar } from '@/components/avatar';
import { getCurrentUser, getUserId, type SessionUser } from '@/lib/session';
import { getMemberProfile } from '@/lib/queries';
import { avatarColor, initials, type CommunityPost } from '@/lib/community';
import {
  IconArrowLeft,
  IconHeart,
  IconInstagram,
  IconMedal,
  IconTikTok,
  IconTrophy,
} from '@/components/icons';

type Params = Promise<{ id: string }>;

interface ProfileResponse {
  user: SessionUser;
  stats: { posts: number; likesReceived: number };
  posts: CommunityPost[];
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const data = await getMemberProfile(id, id).catch(() => null);
  return { title: data ? `${data.user.name} · Comunidad` : 'Perfil de la Comunidad' };
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="inline-flex items-center gap-1.5 font-display text-[19px] font-bold text-[var(--text)]">
        {icon}
        {value}
      </p>
      <p className="text-[11.5px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

export default async function MemberProfilePage({ params }: { params: Params }) {
  const viewerId = await getUserId();
  if (!viewerId) redirect('/login');

  const { id } = await params;
  const [data, me] = await Promise.all([
    getMemberProfile(id, viewerId).catch(() => null) as Promise<ProfileResponse | null>,
    getCurrentUser(),
  ]);

  if (!data) notFound();

  const { user, stats, posts } = data;
  const isMe = me?.id === user.id;
  const { tier } = user;

  return (
    <>
      <PageHeader title="Perfil de la Comunidad" />

      <div className="mx-auto max-w-[720px] px-5 pb-12 pt-2 sm:px-8">
        <Link
          href="/comunidade"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Comunidad
        </Link>

        <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--shadow-soft)]">
          <div className="flex justify-center">
            <Avatar
              name={user.name}
              src={user.avatar}
              size={104}
              color={avatarColor(user.name)}
              fallback={initials(user.name)}
              className="ring-4 ring-[var(--violet-soft)]"
            />
          </div>

          <h2 className="mt-3 font-display text-[22px] font-semibold tracking-tight text-[var(--text)]">
            {user.name}
          </h2>

          <span className="mt-1.5 inline-block rounded-full bg-[var(--violet-soft)] px-3 py-1 text-[11.5px] font-bold text-[var(--brand)]">
            {tier.current.label}
          </span>

          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[var(--text-muted)]">
            {user.bio || (isMe ? 'Aún no escribiste tu bio.' : 'Sin bio todavía.')}
          </p>

          {(user.instagram || user.tiktok) && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {user.instagram && (
                <a
                  href={`https://instagram.com/${user.instagram}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
                >
                  <IconInstagram className="h-4 w-4" />@{user.instagram}
                </a>
              )}
              {user.tiktok && (
                <a
                  href={`https://tiktok.com/@${user.tiktok}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
                >
                  <IconTikTok className="h-4 w-4" />@{user.tiktok}
                </a>
              )}
            </div>
          )}

          <div className="mt-5 flex items-start justify-center gap-8">
            <Stat label="publicaciones" value={String(stats.posts)} />
            <Stat
              label="me gusta"
              value={String(stats.likesReceived)}
              icon={<IconHeart className="h-4 w-4 text-red-500" />}
            />
            <Stat
              label="miembro desde"
              value={new Date(user.joinedAt).toLocaleDateString('es-419', {
                month: 'short',
                year: '2-digit',
              })}
            />
          </div>

          {isMe && (
            <Link
              href="/perfil"
              className="mt-5 inline-block rounded-2xl border border-[var(--border)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
            >
              Editar perfil
            </Link>
          )}
        </section>

        <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
            Logros y gamificación
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-[image:var(--sidebar-bg)] px-4 py-3.5 text-white">
              <IconTrophy className="h-6 w-6 shrink-0 text-[var(--color-gold-400)]" />
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/60">
                  Nivel actual
                </p>
                <p className="font-display text-[17px] font-semibold">{tier.current.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-[var(--bg-sunken)] px-4 py-3.5">
              <IconMedal className="h-6 w-6 shrink-0 text-[var(--text-faint)]" />
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                  Próximo nivel
                </p>
                <p className="font-display text-[17px] font-semibold text-[var(--text)]">
                  {tier.next?.label ?? 'Nivel máximo'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
              <div
                className="h-full rounded-full bg-[var(--brand)]"
                style={{ width: `${Math.round(tier.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 flex justify-between text-[11.5px] text-[var(--text-faint)]">
              <span>{user.points.toLocaleString('es-419')} pontos</span>
              {tier.next && <span>{tier.next.min.toLocaleString('es-419')} para {tier.next.label}</span>}
            </p>
          </div>
        </section>

        <h3 className="mt-6 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Publicaciones
        </h3>

        <div className="mt-3 flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {posts.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-14 text-center text-[13.5px] text-[var(--text-muted)]">
              Aún no hay publicaciones.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
