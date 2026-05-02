'use client';

import { useState, useTransition, useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { uploadOrgLogo, deleteOrgLogo } from '@/server/actions/org';

export function OrgLogoUpload({ existing }: { existing: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadOrgLogo(formData);
        if (fileRef.current) fileRef.current.value = '';
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload gagal');
      }
    });
  }

  function onDelete() {
    if (!confirm('Hapus logo? PDF akan fallback ke logo text.')) return;
    setError(null);
    startTransition(async () => {
      try { await deleteOrgLogo(); } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Hapus gagal');
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md h-28 p-3">
        {existing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existing} alt="logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-sm text-slate-400">(belum upload — PDF pakai logo text)</span>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form action={onUpload} className="flex gap-2 items-center">
        <input
          ref={fileRef}
          type="file" name="file" required
          accept="image/png,image/jpeg,image/webp"
          className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1 min-w-0"
        />
        <Button type="submit" size="sm" disabled={pending}>
          <Upload className="h-3 w-3" /> {pending ? 'Upload…' : 'Upload'}
        </Button>
        {existing && (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        )}
      </form>
      <p className="text-xs text-slate-500">
        PNG/JPG transparent, ideal aspek wide (mis. 200×60 px). Akan tampil di kanan atas PDF proposal.
      </p>
    </div>
  );
}
