import { PageHeader } from './page-header';

/**
 * Tela ainda não construída.
 *
 * Existe pra o menu não ter link morto — e diz o que falta em vez de fingir
 * que a funcionalidade está pronta.
 */
export function ComingSoon({
  title,
  subtitle,
  needs,
}: {
  title: string;
  subtitle: string;
  needs: string[];
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="mx-auto max-w-[640px] px-5 pb-12 pt-6 sm:px-8">
        <div className="rounded-[24px] bg-[var(--bg-elevated)] p-8 text-center shadow-[var(--shadow-soft)]">
          <span className="inline-flex rounded-full bg-[var(--violet-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
            En construcción
          </span>

          <h2 className="mt-4 font-display text-[22px] font-semibold text-[var(--text)]">
            Aún no está listo
          </h2>

          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--text-muted)]">
            Esta pantalla aún no tiene backend. Lo que falta para que funcione:
          </p>

          <ul className="mx-auto mt-5 max-w-md space-y-2 text-left">
            {needs.map((need) => (
              <li
                key={need}
                className="flex gap-2.5 rounded-xl bg-[var(--bg-sunken)] px-4 py-2.5 text-[13.5px] text-[var(--text-muted)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                {need}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
