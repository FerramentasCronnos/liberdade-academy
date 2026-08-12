import { logout } from '@/app/login/actions';
import { IconLogout } from './icons';

export function LogoutButton({ full = false }: { full?: boolean }) {
  return (
    <form action={logout} className={full ? 'w-full' : undefined}>
      <button
        type="submit"
        className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-[13.5px] font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 ${
          full ? 'w-full' : ''
        }`}
      >
        <IconLogout className="h-4 w-4" />
        Sair
      </button>
    </form>
  );
}
