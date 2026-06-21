import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Circle, Loader, CheckCircle2, Pencil, Search, LayoutGrid, Calendar } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { downloadExport } from '../lib/download';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useProject, useUpdateProject } from '../hooks/queries/workspace';
import { useMembers, useTags } from '../hooks/queries/members';
import {
  useCreateTask,
  useDeleteTask,
  useProjectTasks,
  useUpdateTask,
} from '../hooks/queries/task';
import type { Task, TaskStatus } from '../lib/types';
import { KanbanBoard } from '../components/KanbanBoard';
import { CalendarView } from '../components/CalendarView';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskBoardFilters, applyFilters, type TaskFilters, type TaskBoardFiltersHandle } from '../components/TaskBoardFilters';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { EditProjectModal } from '../components/EditProjectModal';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ExportMenu } from '../components/ExportMenu';

const statusMeta: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  TODO: { label: 'A fazer', icon: Circle, color: '#6B5E54' },
  IN_PROGRESS: { label: 'Em progresso', icon: Loader, color: '#7A8FA8' },
  DONE: { label: 'Concluídas', icon: CheckCircle2, color: '#5A7A6A' },
};

const defaultFilters: TaskFilters = {
  search: '',
  assigneeId: '',
  priority: '',
  status: '',
  tagId: '',
};

export function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban');
  const [exporting, setExporting] = useState(false);
  const filtersRef = useRef<TaskBoardFiltersHandle>(null);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(workspaceId, projectId);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useProjectTasks(projectId);
  const { data: members = [] } = useMembers(workspaceId);
  const { data: tags = [] } = useTags(workspaceId);

  const createTask = useCreateTask(projectId, workspaceId);
  const updateTask = useUpdateTask(projectId, workspaceId);
  const deleteTask = useDeleteTask(projectId, workspaceId);
  const updateProject = useUpdateProject(workspaceId, projectId);

  const loading = projectLoading || tasksLoading;
  const queryError = projectError || tasksError;

  const openCreate = useCallback(() => setShowCreate(true), []);
  const focusSearch = useCallback(() => filtersRef.current?.focusSearch(), []);

  useKeyboardShortcuts([
    { key: 'n', handler: openCreate, enabled: !showCreate && !selectedTask && !showEditProject },
    { key: '/', handler: focusSearch },
  ]);

  const workspace = getActiveWorkspace();
  const canDelete = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const canManage = canDelete;

  useEffect(() => {
    const openTaskId = (location.state as { openTaskId?: string } | null)?.openTaskId;
    if (!openTaskId || tasks.length === 0) return;
    const task = tasks.find((t) => t.id === openTaskId);
    if (task) setSelectedTask(task);
  }, [location.state, tasks]);

  const filteredTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setError('');
    try {
      await updateTask.mutateAsync({ taskId, data: { status } });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreate = async (data: {
    title: string;
    description?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    tagIds?: string[];
  }) => {
    setError('');
    await createTask.mutateAsync(data);
  };

  const handleUpdate = async (id: string, data: Partial<Task> & { tagIds?: string[] }) => {
    setError('');
    const updated = await updateTask.mutateAsync({ taskId: id, data });
    setSelectedTask(updated);
  };

  const handleSubtasksChange = (taskId: string, subtasks: { completed: boolean }[]) => {
    setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, subtasks } : prev));
  };

  const handleDueDateChange = async (taskId: string, dueDate: string) => {
    setError('');
    try {
      const updated = await updateTask.mutateAsync({ taskId, data: { dueDate } });
      setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    await deleteTask.mutateAsync(id);
    setSelectedTask(null);
  };

  const handleDeleteFromBoard = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    try {
      await handleDelete(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleEditProject = async (data: { name: string; description?: string }) => {
    setError('');
    await updateProject.mutateAsync(data);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!projectId) return;
    setExporting(true);
    try {
      await downloadExport(`/projects/${projectId}/tasks/export`, {
        format,
        search: filters.search || undefined,
        assigneeId: filters.assigneeId || undefined,
        priority: filters.priority || undefined,
        status: filters.status || undefined,
        tagId: filters.tagId || undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const counts = {
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  };
  const progress = tasks.length > 0 ? Math.round((counts.DONE / tasks.length) * 100) : 0;

  const displayError = error || (queryError ? getErrorMessage(queryError) : '');

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg mb-6" />
        <LoadingSkeleton variant="kanban" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-danger font-medium">Projeto não encontrado</p>
        <Link to={`/w/${workspaceId}`} className="text-terracotta text-sm mt-2 inline-block hover:underline">
          Voltar aos projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <Link
          to={`/w/${workspaceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-espresso-faint hover:text-terracotta transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Projetos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
                {project.name}
              </h1>
              {canManage && (
                <button
                  onClick={() => setShowEditProject(true)}
                  className="p-1.5 rounded-lg text-espresso-faint hover:text-terracotta hover:bg-cream-dark transition-colors"
                  aria-label="Editar projeto"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {project.description && (
              <p className="text-espresso-muted mt-1.5 text-sm max-w-xl">{project.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-4">
              {(Object.keys(statusMeta) as TaskStatus[]).map((status) => {
                const meta = statusMeta[status];
                const Icon = meta.icon;
                return (
                  <div key={status} className="flex items-center gap-1.5 text-sm">
                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    <span className="text-espresso-muted">{counts[status]}</span>
                    <span className="text-espresso-faint text-xs hidden sm:inline">{meta.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <div className="w-24 h-1.5 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sage transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-sage">{progress}%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <ExportMenu onExport={handleExport} loading={exporting} />
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nova tarefa
              <kbd className="hidden sm:inline ml-1.5 text-[10px] font-normal opacity-60 border border-current rounded px-1">
                N
              </kbd>
            </Button>
          </div>
        </div>
      </div>

      {displayError && <Alert className="mb-6">{displayError}</Alert>}

      <div className="flex items-center gap-1 mb-4 p-1 bg-cream-dark/60 border border-sand rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setView('kanban')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'kanban'
              ? 'bg-surface text-espresso shadow-sm'
              : 'text-espresso-muted hover:text-espresso'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Kanban
        </button>
        <button
          type="button"
          onClick={() => setView('calendar')}
          data-testid="calendar-view-toggle"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'calendar'
              ? 'bg-surface text-espresso shadow-sm'
              : 'text-espresso-muted hover:text-espresso'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendário
        </button>
      </div>

      <TaskBoardFilters
        ref={filtersRef}
        tasks={tasks}
        members={members}
        tags={tags}
        filters={filters}
        onChange={setFilters}
      />

      {filteredTasks.length === 0 && tasks.length > 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma tarefa encontrada"
          description="Tente ajustar os filtros para ver mais resultados."
          action={{ label: 'Limpar filtros', onClick: () => setFilters(defaultFilters) }}
        />
      ) : view === 'calendar' ? (
        <CalendarView
          tasks={filteredTasks}
          statusMeta={statusMeta}
          onTaskClick={setSelectedTask}
          onDueDateChange={handleDueDateChange}
        />
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteFromBoard}
          onTaskClick={setSelectedTask}
          canDelete={canDelete}
        />
      )}

      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        members={members}
        tags={tags}
        onSubmit={handleCreate}
      />

      <TaskDetailModal
        task={selectedTask}
        members={members}
        tags={tags}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleUpdate}
        onSubtasksChange={handleSubtasksChange}
        onDelete={canDelete ? handleDelete : undefined}
        currentUserId={user?.id}
        canDelete={canDelete}
        canManage={canManage}
      />

      <EditProjectModal
        project={project}
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        onSubmit={handleEditProject}
      />
    </div>
  );
}
