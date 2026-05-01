'use client';

import { useState, useTransition } from 'react';
import { Button } from './ui/button';
import { FormField, Input, Textarea } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatIDR } from '@/lib/format';

type Item = { proposalItemId: number | null; name: string; qty: number; unitPrice: number };

export function LpjForm({
  action,
  proposalId,
  proposalTotal,
  initialItems,
  initialNarrative,
  initialEvaluation,
  submitLabel = 'Simpan Draft',
}: {
  action: (formData: FormData) => Promise<void>;
  proposalId: number;
  proposalTotal: number;
  initialItems: Item[];
  initialNarrative?: string | null;
  initialEvaluation?: string | null;
  submitLabel?: string;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalRealized = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const variance = proposalTotal - totalRealized;

  function update(idx: number, patch: Partial<Item>) {
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
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
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <input type="hidden" name="proposalId" value={proposalId} />

      <Card>
        <CardHeader><CardTitle>Realisasi per Item</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-right w-16">Qty</th>
                  <th className="py-2 text-right w-36">Harga Aktual</th>
                  <th className="py-2 text-right w-36">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const isFromProposal = it.proposalItemId !== null;
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2">
                        {isFromProposal ? (
                          <div>
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-slate-500">dari proposal</div>
                          </div>
                        ) : (
                          <Input value={it.name} onChange={(e) => update(idx, { name: e.target.value })} placeholder="Item tambahan" />
                        )}
                      </td>
                      <td className="py-1.5 px-1">
                        <Input type="number" min={0} value={it.qty} onChange={(e) => update(idx, { qty: Number(e.target.value) })} className="text-right" />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input type="number" min={0} step={1000} value={it.unitPrice} onChange={(e) => update(idx, { unitPrice: Number(e.target.value) })} className="text-right" />
                      </td>
                      <td className="py-1.5 px-1 text-right text-slate-600">{formatIDR(it.qty * it.unitPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="py-3 text-right font-medium">Total Proposal</td>
                  <td className="py-3 text-right">{formatIDR(proposalTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right font-medium">Total Realisasi</td>
                  <td className="py-1 text-right font-semibold">{formatIDR(totalRealized)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right font-medium">Selisih</td>
                  <td className={`py-1 text-right font-semibold ${variance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatIDR(variance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Button
            type="button" variant="outline" size="sm" className="mt-3"
            onClick={() => setItems((xs) => [...xs, { proposalItemId: null, name: '', qty: 1, unitPrice: 0 }])}
          >
            + Tambah item lain (di luar proposal)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Narasi & Evaluasi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Narasi Pelaksanaan" hint="Max 5000 karakter">
            <Textarea name="narrative" rows={5} maxLength={5000} defaultValue={initialNarrative ?? ''} />
          </FormField>
          <FormField label="Kendala & Evaluasi" hint="Max 3000 karakter">
            <Textarea name="evaluation" rows={4} maxLength={3000} defaultValue={initialEvaluation ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : submitLabel}</Button>
    </form>
  );
}
