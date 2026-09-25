import { ThemeToggle } from './theme-toggle';

export function PageHeader({
  title,
  subtitle,
  action,
  flush = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Sem recuo lateral: para quando o contêiner pai já tem o seu. */
  flush?: boolean;
}) {
  return (
    <header className={`flex flex-wrap items-center gap-4 pb-2 pt-7 ${flush ? '' : 'px-5 sm:px-8'}`}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13.5px] text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {action}
        <ThemeToggle />
      </div>
    </header>
  );
}
