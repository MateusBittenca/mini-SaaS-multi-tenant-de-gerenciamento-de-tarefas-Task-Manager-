import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderKanban, ListTodo, Loader, Search } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import type { WorkspaceSearchResult } from '../lib/types';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkspaceSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!workspaceId || q.trim().length < 2) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data: res } = await api.get<{ data: WorkspaceSearchResult }>(
          `/workspaces/${workspaceId}/search`,
          { params: { q: q.trim() } }
        );
        setResults(res.data);
      } catch (err) {
        setError(getErrorMessage(err));
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const goToProject = (projectId: string) => {
    onClose();
    navigate(`/w/${workspaceId}/projects/${projectId}`);
  };

  const goToTask = (projectId: string, taskId: string) => {
    onClose();
    navigate(`/w/${workspaceId}/projects/${projectId}`, { state: { openTaskId: taskId } });
  };

  if (!open) return null;

  const hasResults =
    results && (results.tasks.length > 0 || results.projects.length > 0);
  const isEmpty = results && results.tasks.length === 0 && results.projects.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-sidebar/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-surface border border-sand rounded-2xl shadow-[var(--shadow-modal)] overflow-hidden animate-fade-in"
        role="dialog"
        aria-modal
        aria-label="Busca global"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sand">
          <Search className="w-5 h-5 text-espresso-faint shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar tarefas e projetos..."
            className="flex-1 bg-transparent text-espresso placeholder:text-espresso-faint outline-none text-sm"
          />
          <kbd className="hidden sm:inline text-[10px] text-espresso-faint bg-cream-dark px-1.5 py-0.5 rounded border border-sand">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-espresso-muted text-sm">
              <Loader className="w-4 h-4 animate-spin" />
              Buscando...
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <p className="py-8 text-center text-sm text-espresso-faint">
              Digite pelo menos 2 caracteres
            </p>
          )}

          {!loading && error && (
            <p className="py-6 px-4 text-center text-sm text-danger">{error}</p>
          )}

          {!loading && isEmpty && (
            <p className="py-8 text-center text-sm text-espresso-muted">Nenhum resultado encontrado</p>
          )}

          {!loading && hasResults && (
            <div className="py-2">
              {results!.projects.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-espresso-faint font-medium">
                    Projetos
                  </p>
                  <ul>
                    {results!.projects.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => goToProject(project.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cream-dark transition-colors"
                        >
                          <FolderKanban className="w-4 h-4 text-terracotta shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-espresso truncate">{project.name}</p>
                            {project.description && (
                              <p className="text-xs text-espresso-faint truncate">{project.description}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results!.tasks.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-espresso-faint font-medium">
                    Tarefas
                  </p>
                  <ul>
                    {results!.tasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => goToTask(task.projectId, task.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cream-dark transition-colors"
                        >
                          <ListTodo className="w-4 h-4 text-sage shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-espresso truncate">{task.title}</p>
                            <p className="text-xs text-espresso-faint truncate">{task.projectName}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-sand bg-cream/50">
          <p className="text-[10px] text-espresso-faint text-center">
            <kbd className="px-1 py-0.5 rounded bg-surface border border-sand">⌘</kbd>
            {' '}
            <kbd className="px-1 py-0.5 rounded bg-surface border border-sand">K</kbd>
            {' '}para abrir
          </p>
        </div>
      </div>
    </div>
  );
}

export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}
