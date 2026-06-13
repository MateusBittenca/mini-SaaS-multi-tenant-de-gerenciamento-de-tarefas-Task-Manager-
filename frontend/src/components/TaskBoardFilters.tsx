import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Task, WorkspaceMember } from '../lib/types';

export interface TaskFilters {
  search: string;
  assigneeId: string;
  priority: string;
  status: string;
}

interface TaskBoardFiltersProps {
  tasks: Task[];
  members: WorkspaceMember[];
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

export interface TaskBoardFiltersHandle {
  focusSearch: () => void;
}

export const TaskBoardFilters = forwardRef<TaskBoardFiltersHandle, TaskBoardFiltersProps>(
  function TaskBoardFilters({ tasks, members, filters, onChange }, ref) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState(filters.search);

  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ ...filters, search: searchInput });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filteredCount = useMemo(() => {
    return applyFilters(tasks, { ...filters, search: searchInput }).length;
  }, [tasks, filters, searchInput]);

  const hasFilters =
    filters.search || filters.assigneeId || filters.priority || filters.status;

  const clearFilters = () => {
    setSearchInput('');
    onChange({ search: '', assigneeId: '', priority: '', status: '' });
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-faint" />
          <input
            ref={searchRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          />
        </div>
        <select
          value={filters.assigneeId}
          onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
          className="px-3 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        >
          <option value="">Todos responsáveis</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
          className="px-3 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        >
          <option value="">Todas prioridades</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="px-3 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        >
          <option value="">Todos status</option>
          <option value="TODO">A fazer</option>
          <option value="IN_PROGRESS">Em progresso</option>
          <option value="DONE">Concluído</option>
        </select>
      </div>
      <div className="flex items-center justify-between text-xs text-espresso-faint">
        <span>
          {filteredCount} de {tasks.length} tarefas
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-terracotta hover:underline"
          >
            <X className="w-3 h-3" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
});

export function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  const q = filters.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.description?.toLowerCase().includes(q))) {
      return false;
    }
    if (filters.assigneeId && t.assigneeId !== filters.assigneeId) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.status && t.status !== filters.status) return false;
    return true;
  });
}
