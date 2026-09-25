'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { attachmentKind } from '@/lib/community';
import { IconImage, IconX } from '@/components/icons';

/**
 * Anexos de ticket: foto, arquivo ou áudio gravado na hora.
 *
 * O upload vai direto do navegador ao Blob (rota /api/upload só assina).
 * As URLs ficam num input oculto que a Server Action lê.
 */
export function AttachmentsField({ name = 'attachments', resetKey, allowAudio = false }: { name?: string; resetKey?: number; allowAudio?: boolean }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const [seenReset, setSeenReset] = useState(resetKey);

  // o formulário foi limpo: zera também os anexos (estado derivado da prop)
  if (resetKey !== seenReset) {
    setSeenReset(resetKey);
    setUrls([]);
  }

  const send = async (file: File | Blob, filename: string) => {
    setBusy(filename);
    setError(null);
    try {
      const blob = await upload(`tickets/${filename}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: file.type || undefined,
      });
      setUrls((prev) => [...prev, blob.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude subir el archivo.');
    } finally {
      setBusy(null);
    }
  };

  const onPick = (file: File) => {
    if (file.size > 40 * 1024 * 1024) {
      setError('Archivo mayor a 40 MB.');
      return;
    }
    void send(file, file.name.replace(/[^\w.-]+/g, '_'));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : 'webm';
        void send(new Blob(chunks, { type }), `audio-${Date.now()}.${ext}`);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('No pude acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  };

  const remove = (url: string) => setUrls((prev) => prev.filter((u) => u !== url));

  const chip = 'inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)] disabled:opacity-60';

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,audio/*,video/mp4,video/quicktime,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />

      {urls.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {urls.map((url) => (
            <li key={url} className="relative">
              <AttachmentPreview url={url} compact />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Quitar adjunto"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
              >
                <IconX className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy) || recording} className={chip}>
          <IconImage className="h-4 w-4" />
          Foto o archivo
        </button>
        {!allowAudio ? null : !recording ? (
          <button type="button" onClick={startRecording} disabled={Boolean(busy)} className={chip}>
            🎙️ Grabar audio
          </button>
        ) : (
          <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Detener · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </button>
        )}
        {busy && <span className="text-[12px] text-[var(--text-faint)]">Subiendo…</span>}
        {error && <span role="alert" className="text-[12px] font-medium text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export function AttachmentPreview({ url, compact = false }: { url: string; compact?: boolean }) {
  const kind = attachmentKind(url);
  const name = decodeURIComponent(url.split('/').pop() ?? 'archivo');

  if (kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-[var(--bg-sunken)]">
        <img src={url} alt="" className={compact ? 'h-16 w-16 object-cover' : 'max-h-[360px] w-full object-cover'} />
      </a>
    );
  }
  if (kind === 'audio') {
    return <audio controls preload="metadata" src={url} className={compact ? 'h-9 w-[220px]' : 'w-full max-w-[380px]'} />;
  }
  if (kind === 'video') {
    return <video controls preload="metadata" src={url} className={compact ? 'h-16 w-24 rounded-xl object-cover' : 'max-h-[360px] w-full rounded-xl'} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-sunken)] px-3 py-2 text-[12.5px] font-semibold text-[var(--brand)]">
      📎 {name}
    </a>
  );
}

export function AttachmentList({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {urls.map((u) => (
        <AttachmentPreview key={u} url={u} />
      ))}
    </div>
  );
}
