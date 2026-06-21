import { mkdirSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
]);

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

export function getMaxUploadBytes(): number {
  const parsed = Number(process.env.MAX_UPLOAD_SIZE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

function ensureTaskUploadDir(taskId: string): string {
  const dir = path.join(getUploadDir(), 'tasks', taskId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const taskAttachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const taskId = String(req.params.id);
        cb(null, ensureTaskUploadDir(taskId));
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 20);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

export function getAttachmentAbsolutePath(storageKey: string): string {
  return path.join(getUploadDir(), storageKey);
}

export function buildStorageKey(taskId: string, storedFilename: string): string {
  return path.posix.join('tasks', taskId, storedFilename);
}
