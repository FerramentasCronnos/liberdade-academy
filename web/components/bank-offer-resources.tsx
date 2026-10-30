import { IconExternal } from './icons';
import { DriveCreatives } from './drive-creatives';
import { listDriveFolder } from '@/lib/drive-folder';

/**
 * Recursos do afiliado nas Bank Offers: criativos (pasta do Drive, para ver e
 * baixar sem sair do catálogo). Presell e links de afiliação ficam no card ao
 * lado da comissão, por nível de compra.
 */
const KIND_LABEL: Record<string, { title: string; hint: string; emoji: string }> = {
  creatives: { title: 'Creativos', hint: 'Carpeta con videos, imágenes y anuncios listos para usar.', emoji: '🎬' },
  presell: { title: 'Página de presell', hint: 'Rescata tu página lista para recibir el tráfico y enviarlo a la oferta.', emoji: '📄' },
  link: { title: 'Enlace', hint: '', emoji: '🔗' },
};

/** Id da pasta de criativos no Drive, quando o recurso é um link de pasta. */
function driveFolderId(resources: Array<{ kind: string; url: string }>): string | undefined {
  const r = resources.find((x) => x.kind === 'creatives');
  const m = r?.url.match(/folders\/([A-Za-z0-9_-]+)/);
  return m?.[1];
}

export async function BankOfferResources({
  resources = [],
}: {
  resources?: Array<{ kind: string; label: string; url: string }>;
}) {
  const items = resources;
  const folderId = driveFolderId(resources);
  const files = folderId ? await listDriveFolder(folderId) : [];
  const folderUrl = resources.find((x) => x.kind === 'creatives')?.url ?? '';
  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Recursos para afiliados</h3>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
        Creativos listos para descargar. Tu página de presell y tus enlaces están al lado, junto a la comisión.
      </p>

      {folderId && files.length > 0 && <DriveCreatives files={files} folderUrl={folderUrl} />}

      {folderId && files.length === 0 && (
        // Se a listagem falhar, cai no visualizador do próprio Drive.
        <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <p className="text-[13px] font-semibold text-[var(--text)]">🎬 Creativos de esta oferta</p>
            <p className="text-[11.5px] text-[var(--text-faint)]">Haz clic en un archivo para verlo o descargarlo</p>
          </div>
          <iframe
            src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
            title="Creativos"
            className="h-[460px] w-full border-0 bg-white"
            loading="lazy"
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((r) => {
            const meta = KIND_LABEL[r.kind] ?? KIND_LABEL.link;
            return (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4 transition hover:border-[var(--brand)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[18px]" aria-hidden>
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[var(--text)]">{r.label}</span>
                  {meta.hint && <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-muted)]">{meta.hint}</span>}
                </span>
                <IconExternal className="mt-1 h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              </a>
            );
          })}
        </div>
      )}

    </section>
  );
}
