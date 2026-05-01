import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export type SavedUpload = {
  filePath: string; // public path (e.g. /uploads/abc.jpg)
  fileType: string;
  size: number;
};

export async function saveUpload(file: File, subdir = 'misc'): Promise<SavedUpload> {
  if (!ALLOWED.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / 1024 / 1024} MB)`);
  }

  const ext = file.type === 'application/pdf' ? 'pdf' :
              file.type === 'image/png' ? 'png' :
              file.type === 'image/webp' ? 'webp' : 'jpg';

  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const fullPath = path.join(dir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buf);

  return {
    filePath: `/uploads/${subdir}/${filename}`,
    fileType: file.type,
    size: file.size,
  };
}

export async function deleteUpload(publicPath: string) {
  if (!publicPath.startsWith('/uploads/')) return;
  const rel = publicPath.replace(/^\/uploads\//, '');
  const full = path.join(UPLOAD_ROOT, rel);
  await fs.unlink(full).catch(() => {});
}
