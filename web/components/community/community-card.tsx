import Image from 'next/image';
import Link from 'next/link';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Avatar } from '@/components/avatar';
import { Logo } from '@/components/logo';
import { avatarColor, initials } from '@/lib/community';
import type { CommunitySidebarData } from '@/lib/community-data';

/**
 * Card da comunidade na coluna direita (estilo Skool): capa, descrição,
 * números, avatares e o ranking de engajamento de 30 dias.
 *
 * O "online" tem um piso (ONLINE_FLOOR) somado ao real: decisão da dona da
 * comunidade, para a sala nunca parecer vazia.
 */
const COVER = '/community/mva-cover.jpg';
const SITE = 'catalogo.s4accelerator.com';

function hasCover() {
  // arquivo opcional: enquanto a arte não estiver em public/community, mostra o logo
  try {
    return existsSync(join(process.cwd(), 'public', COVER));
  } catch {
    return false;
  }
}

function formatCount(n: number) {
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace('.0', '').replace('.', ',')}k`;
  return String(n);
}

const MEDAL = ['bg-[#f5c542] text-[#5a4300]', 'bg-[#b9bcc4] text-[#3a3d44]', 'bg-[#c28a57] text-[#4a2d10]'];

export function CommunityCard({ data }: { data: CommunitySidebarData }) {
  const cover = hasCover();

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]">
        <div className="relative aspect-[3/1] w-full bg-[#0e1729]">
          {cover ? (
            <Image src={COVER} alt="Máquina de Ventas Automáticas" fill sizes="320px" className="object-cover" priority />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[image:var(--sidebar-bg)] text-white">
              <Logo onDark />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-display text-[17px] font-semibold leading-tight text-[var(--text)]">
            Máquina de Ventas Automáticas
          </h3>
          <a
            href={`https://${SITE}`}
            className="text-[12.5px] font-medium text-[var(--text-faint)] hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            {SITE}
          </a>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
            Comunidad de afiliados de TikTok Shop, Amazon y Shopee: ofertas validadas cada semana, creadores que más
            venden, clases y soporte para vender sin stock.
          </p>
          <Link href="/catalogo" className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
            <span aria-hidden>🔗</span> Ver el catálogo de ofertas
          </Link>

          <dl className="mt-4 grid grid-cols-3 divide-x divide-[var(--border)] border-y border-[var(--border)] py-3 text-center">
            <div>
              <dd className="font-display text-[18px] font-semibold text-[var(--text)]">{formatCount(data.members)}</dd>
              <dt className="text-[11.5px] text-[var(--text-faint)]">Miembros</dt>
            </div>
            <div>
              <dd className="font-display text-[18px] font-semibold text-[var(--text)]">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--money)] align-middle" aria-hidden />
                {data.online}
              </dd>
              <dt className="text-[11.5px] text-[var(--text-faint)]">Online</dt>
            </div>
            <div>
              <dd className="font-display text-[18px] font-semibold text-[var(--text)]">{data.admins}</dd>
              <dt className="text-[11.5px] text-[var(--text-faint)]">Administradores</dt>
            </div>
          </dl>

          {data.avatars.length > 0 && (
            <div className="mt-3 flex -space-x-2">
              {data.avatars.map((person) => (
                <Link key={person.id} href={`/comunidade/membro/${person.id}`} className="rounded-full ring-2 ring-[var(--bg-elevated)]" title={person.name}>
                  <Avatar name={person.name} src={person.avatar} size={32} color={avatarColor(person.name)} fallback={initials(person.name)} />
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/perfil"
            className="mt-4 block rounded-xl border border-[var(--border)] py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            Mi perfil
          </Link>
        </div>
      </section>

      <section className="rounded-[22px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-[15px] font-semibold text-[var(--text)]">Ranking (30 días)</h3>
        {data.ranking.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">Publica, comenta y recibe likes para aparecer aquí.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2.5">
            {data.ranking.map((person, index) => (
              <li key={person.id} className="flex items-center gap-3">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                    MEDAL[index] ?? 'bg-[var(--bg-sunken)] text-[var(--text-muted)]'
                  }`}
                >
                  {index + 1}
                </span>
                <Link href={`/comunidade/membro/${person.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline">
                  <Avatar name={person.name} src={person.avatar} size={30} color={avatarColor(person.name)} fallback={initials(person.name)} />
                  <span className="truncate text-[13.5px] font-medium text-[var(--text)]">{person.name}</span>
                </Link>
                <span className="text-[13px] font-semibold text-[var(--brand)]">+{person.score}</span>
              </li>
            ))}
          </ol>
        )}
        <Link href="/ranking" className="mt-3 block text-center text-[12.5px] font-semibold text-[var(--brand)] hover:underline">
          Ver todos los rankings
        </Link>
      </section>
    </div>
  );
}
