import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { formatRelativeTime } from '../lib/dates';
import type { TaskComment } from '../lib/types';
import { Button } from './Button';

interface TaskCommentsProps {
  taskId: string;
  currentUserId?: string;
  canManage?: boolean;
}

export function TaskComments({ taskId, currentUserId, canManage }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!taskId) return;
    const load = async () => {
      try {
        const { data: res } = await api.get<{ data: TaskComment[] }>(`/tasks/${taskId}/comments`);
        setComments(res.data);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    };
    load();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.post<{ data: TaskComment }>(`/tasks/${taskId}/comments`, {
        content: content.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setContent('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-espresso">Comentários</h3>

      {comments.length === 0 ? (
        <p className="text-xs text-espresso-faint">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {comments.map((comment) => {
            const canDelete = comment.authorId === currentUserId || canManage;
            const initials = comment.author.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div key={comment.id} className="flex gap-2.5 group">
                <div className="w-7 h-7 rounded-full bg-sage/20 flex items-center justify-center text-[10px] font-semibold text-sage shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-espresso">{comment.author.name}</span>
                    <span className="text-[10px] text-espresso-faint">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto p-0.5 text-espresso-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Excluir comentário"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-espresso-muted mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder="Escreva um comentário..."
          className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={loading} disabled={!content.trim()}>
            Comentar
          </Button>
        </div>
      </form>
    </div>
  );
}
