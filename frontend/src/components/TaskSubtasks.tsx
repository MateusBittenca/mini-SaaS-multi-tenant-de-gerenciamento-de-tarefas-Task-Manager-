import { useEffect, useState } from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import type { Subtask } from '../lib/types';

interface TaskSubtasksProps {
  taskId: string;
  onChange?: (subtasks: { completed: boolean }[]) => void;
}

export function TaskSubtasks({ taskId, onChange }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!taskId) return;
    const load = async () => {
      try {
        const { data: res } = await api.get<{ data: Subtask[] }>(`/tasks/${taskId}/subtasks`);
        setSubtasks(res.data);
        onChange?.(res.data.map((s) => ({ completed: s.completed })));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    };
    load();
  }, [taskId]);

  const notifyChange = (items: Subtask[]) => {
    onChange?.(items.map((s) => ({ completed: s.completed })));
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.post<{ data: Subtask }>(`/tasks/${taskId}/subtasks`, {
        title,
      });
      const next = [...subtasks, res.data];
      setSubtasks(next);
      notifyChange(next);
      setNewTitle('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (subtask: Subtask) => {
    const next = !subtask.completed;
    setSubtasks((prev) => {
      const updated = prev.map((s) => (s.id === subtask.id ? { ...s, completed: next } : s));
      notifyChange(updated);
      return updated;
    });
    try {
      await api.patch(`/subtasks/${subtask.id}`, { completed: next });
    } catch (err) {
      setSubtasks((prev) => {
        const reverted = prev.map((s) =>
          s.id === subtask.id ? { ...s, completed: subtask.completed } : s
        );
        notifyChange(reverted);
        return reverted;
      });
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (subtaskId: string) => {
    try {
      await api.delete(`/subtasks/${subtaskId}`);
      setSubtasks((prev) => {
        const next = prev.filter((s) => s.id !== subtaskId);
        notifyChange(next);
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-espresso inline-flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-terracotta" />
          Checklist
        </h3>
        {total > 0 && (
          <span className="text-xs text-espresso-faint">
            {completed}/{total} concluídas
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 rounded-full bg-sand overflow-hidden">
          <div
            className="h-full rounded-full bg-sage transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {subtasks.length > 0 && (
        <ul className="space-y-1.5">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center gap-2 group rounded-lg px-2 py-1.5 -mx-2 hover:bg-cream-dark/60"
            >
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => handleToggle(subtask)}
                className="w-4 h-4 rounded border-sand text-terracotta focus:ring-terracotta/30 shrink-0"
              />
              <span
                className={`flex-1 text-sm ${
                  subtask.completed ? 'line-through text-espresso-faint' : 'text-espresso'
                }`}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(subtask.id)}
                className="p-0.5 text-espresso-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Excluir item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Adicionar item..."
          disabled={loading}
          className="flex-1 px-3 py-2 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
