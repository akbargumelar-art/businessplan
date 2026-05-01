'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input, FormField, Textarea, Select } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatIDR } from '@/lib/format';

type Item = { name: string; qty: number; unitPrice: number };

type AllocationOption = {
  id: number;
  label: string;
  available: number;
  category: string;
  period: string;
};

export function ProposalForm({
  action,
  allocations,
  initial,
  submitLabel = 'Simpan Draft',
}: {
  action: (formData: FormData) => Promise<void>;
  allocations: AllocationOption[];
  initial?: {
    title?: string;
    objective?: string | null;
    goal?: string | null;
    allocationId?: number;
    eventStartDate?: string;
    eventEndDate?: string;
    items?: Item[];
  };
  submitLabel?: string;
}) {
  const [items, setItems] = useState<Item[]>(initial?.items?.length ? initial.items : [{ name: '', qty: 1, unitPrice: 0 }]);
  const [allocationId, setAllocationId] = useState<number | undefined>(initial?.allocationId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const selected = allocations.find((a) => a.id === allocationId);
  const overBudget = selected ? total > selected.available : false;

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function removeItem(idx: number) {
    setItems((xs) => xs.length === 1 ? xs : xs.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((xs) => [...xs, { name: '', qty: 1, unitPrice: 0 }]);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set('items', JSON.stringify(items));
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Gagal menyimpan';
        if (!msg.includes('NEXT_REDIRECT')) setError(msg);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 border border-red-200">{error}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Informasi Dasar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Judul Proposal" required>
            <Input name="title" required defaultValue={initial?.title} placeholder="Contoh: Promo HUT RI Agustus" />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Tanggal Mulai" required>
              <Input name="eventStartDate" type="date" required defaultValue={initial?.eventStartDate} />
            </FormField>
            <FormField label="Tanggal Selesai" required>
              <Input name="eventEndDate" type="date" required defaultValue={initial?.eventEndDate} />
            </FormField>
          </div>

          <FormField label="Objective" hint="Tujuan jangka pendek dari kegiatan">
            <Textarea name="objective" rows={2} defaultValue={initial?.objective ?? ''} />
          </FormField>
          <FormField label="Goal" hint="Outcome yang diharapkan">
            <Textarea name="goal" rows={2} defaultValue={initial?.goal ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sumber Dana</CardTitle></CardHeader>
        <CardContent>
          <FormField label="Alokasi Budget" required hint="Pilih alokasi periode aktif yang akan dipotong">
            <Select
              name="allocationId"
              required
              value={allocationId ?? ''}
              onChange={(e) => setAllocationId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">— Pilih alokasi —</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} (sisa {formatIDR(a.available)})
                </option>
              ))}
            </Select>
          </FormField>

          {selected && (
            <div className="mt-3 rounded-md bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Periode</span>
                <span className="font-medium">{selected.period}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Kategori</span>
                <span className="font-medium">{selected.category}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Sisa Alokasi</span>
                <span className="font-medium">{formatIDR(selected.available)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Penyerapan Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 text-left">Nama Item</th>
                  <th className="py-2 text-right w-20">Qty</th>
                  <th className="py-2 text-right w-44">Harga Satuan</th>
                  <th className="py-2 text-right w-44">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">
                      <Input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} placeholder="Nama item" required />
                    </td>
                    <td className="py-1.5 px-1">
                      <Input type="number" min={1} value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} className="text-right" />
                    </td>
                    <td className="py-1.5 px-1">
                      <Input type="number" min={0} step={1000} value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} className="text-right" />
                    </td>
                    <td className="py-1.5 px-1 text-right text-slate-600">{formatIDR(it.qty * it.unitPrice)}</td>
                    <td className="py-1.5 pl-1">
                      <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-3 text-right font-medium">Total</td>
                  <td className={`py-3 text-right font-semibold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}>{formatIDR(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Tambah Item
          </Button>

          {overBudget && selected && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              Total melebihi sisa alokasi ({formatIDR(selected.available)}). Anda tetap bisa simpan draft, tapi finalize akan ditolak — kurangi total atau ajukan reallocation lebih dulu.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
