'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconX } from './icons';

/**
 * Recorte de imagem antes do upload, sem biblioteca: a foto é desenhada num
 * canvas dentro de uma moldura com a proporção escolhida; a pessoa arrasta,
 * dá zoom e gira, e o resultado sai como um File novo (JPEG) para o fluxo de
 * upload que já existia. Assim a foto de perfil e a capa do aviso saem do
 * jeito que vão aparecer, em vez de serem cortadas pela tela depois.
 */
export type AspectPreset = { id: string; label: string; value: number | null };

export const AVATAR_PRESETS: AspectPreset[] = [{ id: 'square', label: 'Cuadrada', value: 1 }];
export const COVER_PRESETS: AspectPreset[] = [
  { id: 'wide', label: 'Portada 16:9', value: 16 / 9 },
  { id: 'banner', label: 'Banner 3:1', value: 3 },
  { id: 'square', label: 'Cuadrada', value: 1 },
];
export const POST_PRESETS: AspectPreset[] = [
  { id: 'original', label: 'Original', value: null },
  { id: 'square', label: 'Cuadrada', value: 1 },
  { id: 'portrait', label: 'Vertical 4:5', value: 4 / 5 },
  { id: 'wide', label: 'Horizontal 16:9', value: 16 / 9 },
];

const FRAME_MAX_W = 520;
const FRAME_MAX_H = 420;

export function ImageCropDialog({
  file,
  title = 'Ajustar foto',
  presets,
  shape = 'rect',
  outputWidth = 1600,
  onCancel,
  onConfirm,
}: {
  file: File;
  title?: string;
  presets: AspectPreset[];
  /** circle só muda a máscara da pré-visualização; o arquivo sai quadrado. */
  shape?: 'rect' | 'circle';
  /** Largura do arquivo final; a altura segue a proporção. */
  outputWidth?: number;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState(presets[0]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // carrega a imagem uma vez; revoga a URL ao fechar
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // dimensões da imagem já considerando a rotação
  const rotated = useMemo(() => {
    if (!image) return { w: 1, h: 1 };
    const sideways = rotation % 180 !== 0;
    return { w: sideways ? image.naturalHeight : image.naturalWidth, h: sideways ? image.naturalWidth : image.naturalHeight };
  }, [image, rotation]);

  const aspect = preset.value ?? rotated.w / rotated.h;

  // moldura na tela: cabe em FRAME_MAX mantendo a proporção
  const frame = useMemo(() => {
    let w = FRAME_MAX_W;
    let h = w / aspect;
    if (h > FRAME_MAX_H) {
      h = FRAME_MAX_H;
      w = h * aspect;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }, [aspect]);

  // escala mínima: a imagem sempre cobre a moldura inteira
  const baseScale = Math.max(frame.w / rotated.w, frame.h / rotated.h);
  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (o: { x: number; y: number }, z = zoom) => {
      const s = baseScale * z;
      const maxX = Math.max(0, (rotated.w * s - frame.w) / 2);
      const maxY = Math.max(0, (rotated.h * s - frame.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
    },
    [baseScale, zoom, rotated, frame],
  );

  // o deslocamento guardado pode ficar fora do limite depois de mudar zoom ou
  // proporção; em vez de corrigir no estado, corrige na hora de desenhar
  const shown = clampOffset(offset);

  // desenha a pré-visualização
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = frame.w * dpr;
    canvas.height = frame.h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frame.w, frame.h);
    ctx.save();
    ctx.translate(frame.w / 2 + shown.x, frame.h / 2 + shown.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();
  }, [image, frame, shown.x, shown.y, rotation, scale]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: shown.x, oy: shown.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    setOffset(clampOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)));
  };

  const confirm = async () => {
    if (!image) return;
    setBusy(true);
    try {
      // não amplia além do que a foto tem: largura real da área visível
      const visible = Math.round(frame.w / scale);
      const width = Math.max(64, Math.min(outputWidth, visible));
      const height = Math.round(width / aspect);
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('canvas');
      const k = width / frame.w; // tela → arquivo
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2 + shown.x * k, height / 2 + shown.y * k);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('No pude generar la imagen.');
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      onConfirm(new File([blob], name, { type: 'image/jpeg' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[600px] rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">{title}</h3>
            <p className="text-[12.5px] text-[var(--text-muted)]">Arrastra para encuadrar, usa el zoom y gira si hace falta.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancelar" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-sunken)] text-[var(--text-muted)] hover:text-[var(--text)]">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {presets.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p)}
                aria-pressed={p.id === preset.id}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                  p.id === preset.id
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-center overflow-hidden rounded-2xl bg-[var(--bg-sunken)] p-3">
          <div className="relative" style={{ width: frame.w, height: frame.h, maxWidth: '100%' }}>
            <canvas
              ref={canvasRef}
              style={{ width: frame.w, height: frame.h, maxWidth: '100%', touchAction: 'none', cursor: 'grab', borderRadius: shape === 'circle' ? '50%' : 12 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            />
            {!image && (
              <p className="absolute inset-0 grid place-items-center text-[13px] text-[var(--text-faint)]">Cargando…</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-2 text-[12px] text-[var(--text-muted)]">
            Zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--brand)]"
            />
          </label>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] hover:border-[var(--border-strong)]"
          >
            Girar 90°
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!image || busy}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
          >
            {busy ? 'Preparando…' : 'Usar esta foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
