'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveProfile, uploadAvatar, type ProfileState } from '@/app/(app)/perfil/actions';
import { avatarColor, initials } from '@/lib/community';
import type { SessionUser } from '@/lib/session';
import { Avatar } from './avatar';
import { IconCheck, IconMedal, IconUpload } from './icons';

const field =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[14.5px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

const labelText = 'mb-1.5 block text-[13px] font-semibold text-[var(--text)]';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[var(--brand)] px-4 py-3.5 text-[14.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </button>
  );
}

export function ProfileForm({ user }: { user: SessionUser }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [avatar, setAvatar] = useState(user.avatar);
  const [bio, setBio] = useState(user.bio ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);

    if (result.error) setUploadError(result.error);
    else setAvatar(result.url);

    setUploading(false);
  };

  return (
    <form action={formAction} className="rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-[18px] font-semibold text-[var(--text)]">Perfil</h2>

      <div className="mt-5 flex flex-col items-center gap-3">
        <Avatar
          name={user.name}
          src={avatar}
          size={104}
          color={avatarColor(user.name)}
          fallback={initials(user.name)}
        />

        {/* o input real fica escondido: o botão é o alvo acessível */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
          }}
        />
        <input type="hidden" name="avatar" value={avatar ?? ''} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-60"
        >
          <IconUpload className="h-4 w-4" />
          {uploading ? 'Subiendo…' : 'Subir foto'}
        </button>

        {uploadError && (
          <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{uploadError}</p>
        )}
      </div>

      <label className="mt-6 block">
        <span className={labelText}>Nombre</span>
        <input name="name" defaultValue={user.name} required maxLength={80} className={field} />
      </label>

      <label className="mt-4 block">
        <span className={labelText}>Correo</span>
        <input
          value={user.email}
          disabled
          className={`${field} cursor-not-allowed opacity-60`}
        />
        <span className="mt-1 block text-[11.5px] text-[var(--text-faint)]">
          El correo es tu acceso y no se puede cambiar aquí.
        </span>
      </label>

      <label className="mt-4 block">
        <span className={labelText}>Bio</span>
        <textarea
          name="bio"
          rows={3}
          maxLength={160}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Cuenta en pocas palabras quién eres (aparece en la Comunidad)"
          className={`${field} resize-none`}
        />
        <span className="mt-1 block text-right text-[11.5px] text-[var(--text-faint)]">
          {bio.length}/160
        </span>
      </label>

      <Link
        href={`/comunidade/membro/${user.id}`}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-[13.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
      >
        <IconMedal className="h-4 w-4" />
        Ver en el Perfil de la Comunidad
      </Link>

      <label className="block">
        <span className={labelText}>Instagram</span>
        <input
          name="instagram"
          defaultValue={user.instagram ?? ''}
          placeholder="@seuusuario"
          className={field}
        />
      </label>

      <label className="mt-4 block">
        <span className={labelText}>TikTok</span>
        <input
          name="tiktok"
          defaultValue={user.tiktok ?? ''}
          placeholder="@seuusuario"
          className={field}
        />
      </label>

      {state.error && (
        <p role="alert" className="mt-4 text-[13px] font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--money)]">
          <IconCheck className="h-4 w-4" />
          Perfil actualizado.
        </p>
      )}

      <div className="mt-5">
        <Submit />
      </div>
    </form>
  );
}
