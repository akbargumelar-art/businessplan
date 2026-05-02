'use client';

import { useState, useTransition, useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { uploadOrgSignature, deleteOrgSignature } from '@/server/actions/org';

type Slot = 'approver' | 'witness' | 'vp' | 'finDir';

const SLOT_META: Record<Slot, { label: string; sub: string }> = {
  approver: { label: 'Menyetujui (Manager Cluster)', sub: 'TTD untuk kolom 2 baris atas' },
  witness: { label: 'Mengetahui (SPV MCOT)', sub: 'TTD untuk kolom 3 baris atas' },
  vp: { label: 'Vice President', sub: 'TTD untuk kolom 1 baris bawah' },
  finDir: { label: 'Direktur Keuangan', sub: 'TTD untuk kolom 2 baris bawah' },
};

export function OrgSignatureUploads({
  signatures,
}: {
  signatures: { approver: string | null; witness: string | null; vp: string | null; finDir: string | null };
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {(Object.keys(SLOT_META) as Slot[]).map((slot) => (
        <SignatureSlot key={slot} slot={slot} existing={signatures[slot]} />
      ))}
    </div>
  );
}

function SignatureSlot({ slot, existing }: { slot: Slot; existing: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = SLOT_META[slot];

  function onUpload(formData: FormData) {
    setError(null);
    formData.set('slot', slot);
    startTransition(async () => {
      try {
        await uploadOrgSignature(formData);
        if (fileRef.current) fileRef.current.value = '';
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload gagal');
      }
    });
  }

  function onDelete() {
    if (!confirm(`Hapus TTD ${meta.label}?`)) return;
    setError(null);
    startTransition(async () => {
      try { await deleteOrgSignature(slot); } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Hapus gagal');
      }
    });
  }

  return (
    <div className="rounded-md border border-slate-200 p-3 space-y-2">
      <div>
        <div className="text-sm font-medium text-slate-800">{meta.label}</div>
        <div className="text-xs text-slate-500">{meta.sub}</div>
      </div>

      <div className="h-20 flex items-center justify-center bg-slate-50 rounded border border-slate-200">
        {existing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existing} alt={meta.label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">(belum upload)</span>
        )}
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}

      <form action={onUpload} className="flex gap-2 items-center">
        <input
          ref={fileRef}
          type="file" name="file" required
          accept="image/png,image/jpeg,image/webp"
          className="text-xs file:mr-2 file:py-0.5 file:px-2 file:text-xs file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1 min-w-0"
        />
        <Button type="submit" size="sm" disabled={pending}>
          <Upload className="h-3 w-3" />
        </Button>
        {existing && (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        )}
      </form>
    </div>
  );
}
