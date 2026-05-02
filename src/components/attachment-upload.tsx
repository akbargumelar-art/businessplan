'use client';

import { useState, useTransition, useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Select, FormField } from './ui/input';
import { uploadProposalAttachment, deleteProposalAttachment } from '@/server/actions/attachments';

type Attachment = {
  id: number;
  filePath: string;
  fileType: string;
  label: string | null;
};

const LABEL_OPTIONS = ['KTP', 'Pass Photo', 'WoK', 'Dokumentasi Rencana', 'Lain-lain'];

export function AttachmentUpload({
  proposalId,
  attachments,
  canEdit,
}: {
  proposalId: number;
  attachments: Attachment[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>('Dokumentasi Rencana');
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadProposalAttachment(formData);
        if (fileRef.current) fileRef.current.value = '';
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload gagal');
      }
    });
  }

  function onDelete(id: number) {
    if (!confirm('Hapus file ini?')) return;
    startTransition(async () => {
      try {
        await deleteProposalAttachment(id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Hapus gagal');
      }
    });
  }

  const ktp = attachments.find((a) => a.label === 'KTP');
  const passPhoto = attachments.find((a) => a.label === 'Pass Photo');
  const wok = attachments.find((a) => a.label === 'WoK');
  const others = attachments.filter((a) => !['KTP', 'Pass Photo', 'WoK'].includes(a.label ?? ''));

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <Slot label="Photo KTP" att={ktp} canEdit={canEdit} onDelete={onDelete} />
        <Slot label="Pass Photo" att={passPhoto} canEdit={canEdit} onDelete={onDelete} />
        <Slot label="WoK" att={wok} canEdit={canEdit} onDelete={onDelete} />
      </div>

      {others.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-600 mb-2">Dokumentasi & Lain-lain</div>
          <div className="grid grid-cols-4 gap-2">
            {others.map((a) => (
              <div key={a.id} className="relative group">
                <a href={a.filePath} target="_blank" rel="noreferrer">
                  {a.fileType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.filePath} alt={a.label ?? ''} className="aspect-square object-cover w-full rounded border border-slate-200" />
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-xs text-slate-500">PDF</div>
                  )}
                </a>
                <div className="text-xs text-slate-600 mt-0.5 truncate">{a.label}</div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="absolute top-1 right-1 bg-white/90 rounded p-0.5 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <form action={onSubmit} className="border-t border-slate-200 pt-3 space-y-3">
          <input type="hidden" name="proposalId" value={proposalId} />
          <div className="grid sm:grid-cols-[160px_1fr_auto] gap-2 items-end">
            <FormField label="Label">
              <Select name="label" value={label} onChange={(e) => setLabel(e.target.value)}>
                {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </FormField>
            <FormField label="File" hint="JPG/PNG/PDF max 5MB">
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </FormField>
            <Button type="submit" size="sm" disabled={pending}>
              <Upload className="h-3 w-3" /> {pending ? 'Upload…' : 'Upload'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Slot({
  label, att, canEdit, onDelete,
}: {
  label: string;
  att?: Attachment;
  canEdit: boolean;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-1">{label}</div>
      <div className="aspect-[4/5] rounded border border-slate-200 overflow-hidden relative bg-slate-50">
        {att ? (
          <>
            <a href={att.filePath} target="_blank" rel="noreferrer">
              {att.fileType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={att.filePath} alt={label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">PDF</div>
              )}
            </a>
            {canEdit && (
              <button
                type="button"
                onClick={() => onDelete(att.id)}
                className="absolute top-1 right-1 bg-white/90 rounded p-1"
              >
                <Trash2 className="h-3 w-3 text-red-600" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
            (kosong)
          </div>
        )}
      </div>
    </div>
  );
}
