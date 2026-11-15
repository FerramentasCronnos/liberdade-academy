/**
 * Lista os arquivos de uma pasta pública do Google Drive sem API key.
 *
 * A página embeddedfolderview (a mesma que o iframe antigo mostrava) é HTML
 * estático com id, nome e tipo de cada arquivo. Lemos no servidor, com cache
 * de 30 min, e montamos a galeria com thumbnail e preview próprios do Drive.
 */
export interface DriveFile {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'folder' | 'file';
  thumbnail: string;
  previewUrl: string;
  downloadUrl: string;
  openUrl: string;
}

export function driveThumbnail(id: string, width = 480) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

function kindFromIcon(icon: string): DriveFile['kind'] {
  if (icon.includes('type/video')) return 'video';
  if (icon.includes('type/image')) return 'image';
  if (icon.includes('vnd.google-apps.folder')) return 'folder';
  return 'file';
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface DriveFolderGroup {
  /** Nome da subpasta; null para os arquivos soltos na pasta principal. */
  name: string | null;
  folderUrl: string;
  files: DriveFile[];
}

async function readFolder(folderId: string): Promise<{ files: DriveFile[]; folders: Array<{ id: string; name: string }> }> {
  const files: DriveFile[] = [];
  const folders: Array<{ id: string; name: string }> = [];
  try {
    const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, {
      next: { revalidate: 1800 },
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MVA catalog)' },
    });
    if (!response.ok) return { files, folders };
    const html = await response.text();
    const entries = html.split('<div class="flip-entry" id="entry-').slice(1);
    for (const entry of entries) {
      const id = entry.match(/^([A-Za-z0-9_-]+)"/)?.[1];
      const name = entry.match(/flip-entry-title">([^<]*)</)?.[1];
      if (!id || !name) continue;
      const icon = entry.match(/flip-entry-list-icon"><img src="([^"]*)"/)?.[1] ?? '';
      const kind = kindFromIcon(icon);
      // subpastas não têm miniatura: algumas vêm com ícone em sprite (sem <img>), então olhamos o link também
      if (kind === 'folder' || entry.includes('/drive/folders/') || entry.includes('aria-label="Folder"')) {
        folders.push({ id, name: decodeEntities(name) });
        continue;
      }
      files.push({
        id,
        name: decodeEntities(name),
        kind,
        thumbnail: driveThumbnail(id),
        previewUrl: `https://drive.google.com/file/d/${id}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
        openUrl: `https://drive.google.com/file/d/${id}/view`,
      });
    }
  } catch {
    // pasta fora do ar ou HTML diferente: a página cai no visualizador do Drive
  }
  return { files, folders };
}

export async function listDriveFolder(folderId: string): Promise<DriveFile[]> {
  return (await readFolder(folderId)).files;
}

/**
 * Arquivos da pasta e de cada subpasta (um nível), em grupos. Pastas que só
 * têm subpastas (ex.: "Love Chart", "Prosperidade") viram uma seção por subpasta.
 */
export async function listDriveFolderGroups(folderId: string): Promise<DriveFolderGroup[]> {
  const root = await readFolder(folderId);
  const subfolders = await Promise.all(
    root.folders.slice(0, 12).map(async (folder) => ({
      name: folder.name,
      folderUrl: `https://drive.google.com/drive/folders/${folder.id}`,
      files: await listDriveFolder(folder.id),
    })),
  );
  const groups: DriveFolderGroup[] = [];
  if (root.files.length > 0) {
    groups.push({ name: null, folderUrl: `https://drive.google.com/drive/folders/${folderId}`, files: root.files });
  }
  return [...groups, ...subfolders.filter((g) => g.files.length > 0)];
}
