import { useRef, useState } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { formatRelativeTime } from '../lib/dates';
import type { TaskAttachment } from '../lib/types';
import {
  useDeleteAttachment,
  useTaskAttachments,
  useUploadAttachment,
} from '../hooks/queries/task';
import { Button } from './Button';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskAttachmentsProps {
  taskId: string;
  currentUserId?: string;
  canManage?: boolean;
}

export function TaskAttachments({ taskId, currentUserId, canManage }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const { data: attachments = [] } = useTaskAttachments(taskId);
  const uploadAttachment = useUploadAttachment(taskId);
  const deleteAttachment = useDeleteAttachment(taskId);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      await uploadAttachment.mutateAsync(file);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setError('');
    try {
      await deleteAttachment.mutateAsync(attachmentId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    setError('');
    try {
      const response = await api.get(
        `/tasks/${taskId}/attachments/${attachment.id}/download`,
        { responseType: 'blob' }
      );
      downloadBlob(response.data as Blob, attachment.filename);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-espresso">Anexos</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          loading={uploadAttachment.isPending}
        >
          <Paperclip className="w-3.5 h-3.5" />
          Adicionar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
        />
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-espresso-faint">Nenhum anexo ainda.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment: TaskAttachment) => {
            const canDelete = attachment.uploadedById === currentUserId || canManage;

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-sand bg-cream/40 group"
              >
                <Paperclip className="w-4 h-4 text-espresso-faint shrink-0" />
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm text-espresso truncate hover:text-terracotta transition-colors">
                    {attachment.filename}
                  </p>
                  <p className="text-[10px] text-espresso-faint">
                    {attachment.uploadedBy.name} · {formatFileSize(attachment.size)} ·{' '}
                    {formatRelativeTime(attachment.createdAt)}
                  </p>
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment.id)}
                    className="p-1 text-espresso-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Excluir anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
