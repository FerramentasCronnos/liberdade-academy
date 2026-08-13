/** Moldura de celular usada nas pré-visualizações do editor. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-white shadow-[var(--shadow-lift)]">
      <div className="flex justify-center py-2">
        <span className="h-1 w-10 rounded-full bg-black/15" />
      </div>
      <div className="h-[520px] overflow-y-auto">{children}</div>
    </div>
  );
}
