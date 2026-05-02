import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024;

const IMAGE_PDF = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const OFFICE = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);

const EXT_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

export type SavedUpload = {
  filePath: string; // public path (e.g. /uploads/abc.jpg)
  fileType: string;
  size: number;
};

export type UploadOptions = {
  /** Set true to allow Office files (xls/doc/ppt + xlsx/docx/pptx). Default false. */
  allowOffice?: boolean;
  /** Override max bytes; defaults to MAX_UPLOAD_MB env (5MB). */
  maxBytes?: number;
};

export async function saveUpload(file: File, subdir = 'misc', opts: UploadOptions = {}): Promise<SavedUpload> {
  const allowed = new Set(IMAGE_PDF);
  if (opts.allowOffice) for (const t of OFFICE) allowed.add(t);

  if (!allowed.has(file.type)) {
    throw new Error(`Tipe file tidak diizinkan: ${file.type}`);
  }
  const max = opts.maxBytes ?? MAX_BYTES;
  if (file.size > max) {
    throw new Error(`File terlalu besar (max ${Math.round(max / 1024 / 1024)} MB)`);
  }

  const ext = EXT_MAP[file.type] ?? 'bin';

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
  const root = path.resolve(UPLOAD_ROOT);
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) return;
  await fs.unlink(full).catch(() => {});
}
