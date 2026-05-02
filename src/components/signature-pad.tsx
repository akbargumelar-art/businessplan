'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Eraser, Save, Upload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { saveDrawnSignature, uploadSignatureFile, deleteSignature } from '@/server/actions/signature';

export function SignaturePad({ existing }: { existing: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current!.x, lastPointRef.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    setHasInk(true);
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function saveDrawn() {
    if (!hasInk) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    const dataUrl = canvas.toDataURL('image/png');
    const fd = new FormData();
    fd.set('dataUrl', dataUrl);
    startTransition(async () => {
      try {
        await saveDrawnSignature(fd);
        clearCanvas();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  function uploadFile(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadSignatureFile(formData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload gagal');
      }
    });
  }

  function removeSignature() {
    if (!confirm('Hapus tanda tangan tersimpan?')) return;
    setError(null);
    startTransition(async () => {
      try { await deleteSignature(); } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Gagal menghapus');
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {existing && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">Tanda tangan tersimpan:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={existing} alt="signature" className="h-16 bg-white border border-slate-200 rounded" />
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={removeSignature} disabled={pending}>
            <Trash2 className="h-3 w-3" /> Hapus
          </Button>
        </div>
      )}

      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">Gambar tanda tangan baru</div>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="block w-full h-40 bg-white border-2 border-dashed border-slate-300 rounded touch-none cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={clearCanvas}>
            <Eraser className="h-3 w-3" /> Bersihkan
          </Button>
          <Button type="button" size="sm" onClick={saveDrawn} disabled={!hasInk || pending}>
            <Save className="h-3 w-3" /> Simpan Gambar
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <div className="text-sm font-medium text-slate-700 mb-2">Atau upload PNG/JPG transparent</div>
        <form action={uploadFile} className="flex items-end gap-2">
          <input
            type="file" name="file" accept="image/png,image/jpeg" required
            className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            <Upload className="h-3 w-3" /> Upload
          </Button>
        </form>
      </div>
    </div>
  );
}
