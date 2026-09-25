import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { TeamBadge } from '@/components/post-card';
import { avatarColor, initials } from '@/lib/community';
import type { MemberCard } from '@/lib/community-data';
import { CATEGORY_LABEL } from '@/lib/types';

export function MembersGrid({ members, q }: { members: MemberCard[]; q: string }) {
  return (
    <>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o nicho…"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-[14px] text-[var(--text)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
        />
      </form>

      {members.length === 0 ? (
        <p className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-6 text-center text-[13.5px] text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
          Nadie coincide con “{q}”.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/comunidade/membro/${m.id}`} className="flex h-full items-center gap-3 rounded-[18px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
                <Avatar name={m.name} src={m.avatar} size={48} color={avatarColor(m.name)} fallback={initials(m.name)} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-[var(--text)]">
                    <span className="truncate">{m.name}</span>
                    {m.isAdmin ? <TeamBadge /> : <span className="rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">Nivel {m.level}</span>}
                  </p>
                  <p className="truncate text-[12.5px] text-[var(--text-muted)]">
                    {m.bio || (m.niche ? `Nicho: ${CATEGORY_LABEL[m.niche] ?? m.niche}` : `${m.posts} ${m.posts === 1 ? 'publicación' : 'publicaciones'}`)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
