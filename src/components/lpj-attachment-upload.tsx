'use client';

import { useState, useTransition, useRef } from 'react';
import { Trash2, Upload, Receipt, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { Select, FormField, Input } from './ui/input';
import { uploadLpjAttachment, deleteLpjAttachment } from '@/server/actions/lpj-attachments';

type Attachment = {
  id: number;
  type: string;
  filePath: string;
  fileType: string;
  label: string | null;
  itemRef: string | null;
};

type LpjItemOpt = { id: number; name: string };

export function LpjAttachmentUpload({
  lpjId,
  attachments,
  items,
  canEdit,
}: {
  lpjId: number;
  attachments: Attachment[];
  items: LpjItemOpt[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'receipt' | 'documentation'>('documentation');
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadLpjAttachment(formData);
        if (fileRef.current) fileRef.current.value = '';
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload gagal');
      }
    });
  }

  function onDelete(id: number) {
    if (!confirm('Hapus file ini?')) return;
    startTransition(async () => {
      try { await deleteLpjAttachment(id); } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Hapus gagal');
      }
    });
  }

  const receipts = attachments.filter((a) => a.type === 'receipt');
  const docs = attachments.filter((a) => a.type === 'documentation');

  function getItemName(itemRef: string | null) {
    if (!itemRef) return null;
    return items.find((i) => i.id === Number(itemRef))?.name ?? null;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <Section title="Nota / Kuitansi" icon={<Receipt className="h-4 w-4" />} count={receipts.length}>
        {receipts.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada nota.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {receipts.map((a) => (
              <FileTile key={a.id} att={a} canEdit={canEdit} onDelete={onDelete} extra={getItemName(a.itemRef)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Foto Dokumentasi Pelaksanaan" icon={<Camera className="h-4 w-4" />} count={docs.length}>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada foto.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {docs.map((a) => (
              <FileTile key={a.id} att={a} canEdit={canEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </Section>

      {canEdit && (
        <form action={onSubmit} className="border-t border-slate-200 pt-3 space-y-3">
          <input type="hidden" name="lpjId" value={lpjId} />
          <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2 items-end">
            <FormField label="Tipe">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value as 'receipt' | 'documentation')}>
                <option value="documentation">Dokumentasi</option>
                <option value="receipt">Nota / Kuitansi</option>
              </Select>
            </FormField>
            <FormField label="File" hint="JPG/PNG/PDF max 5MB">
              <input
                ref={fileRef}
                type="file" name="file" required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </FormField>
            <Button type="submit" size="sm" disabled={pending}>
              <Upload className="h-3 w-3" /> {pending ? 'Upload…' : 'Upload'}
            </Button>
          </div>

          {type === 'receipt' && items.length > 0 && (
            <div className="grid sm:grid-cols-[140px_1fr] gap-2">
              <FormField label="Link ke Item (opsional)" hint="Auto-link nota ke item realisasi">
                <Select name="itemRef">
                  <option value="">— Tidak link —</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Label">
                <Input name="label" placeholder="Nota Indomaret 12 Apr" />
              </FormField>
            </div>
          )}

          {type === 'documentation' && (
            <FormField label="Caption (opsional)">
              <Input name="label" placeholder="Foto pembukaan acara" />
            </FormField>
          )}
        </form>
      )}
    </div>
  );
}

function Section({
  title, icon, count, children,
}: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-2">
        {icon}
        <span>{title}</span>
        <span className="text-slate-400">({count})</span>
      </div>
      {children}
    </div>
  );
}

function FileTile({
  att, canEdit, onDelete, extra,
}: {
  att: Attachment;
  canEdit: boolean;
  onDelete: (id: number) => void;
  extra?: string | null;
}) {
  const isImage = att.fileType.startsWith('image/');
  return (
    <div className="relative group">
      <a href={att.filePath} target="_blank" rel="noreferrer">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={att.filePath} alt={att.label ?? ''} className="aspect-square object-cover w-full rounded border border-slate-200" />
        ) : (
          <div className="aspect-square flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-xs text-slate-500">PDF</div>
        )}
      </a>
      {att.label && <div className="text-xs text-slate-700 mt-0.5 truncate">{att.label}</div>}
      {extra && <div className="text-xs text-slate-500 truncate">→ {extra}</div>}
      {canEdit && (
        <button
          type="button"
          onClick={() => onDelete(att.id)}
          className="absolute top-1 right-1 bg-white/90 rounded p-0.5 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3 text-red-600" />
        </button>
      )}
    </div>
  );
}
