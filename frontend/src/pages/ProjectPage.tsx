import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Circle, Loader, CheckCircle2, Pencil, Search } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Project, Task, TaskStatus, WorkspaceMember } from '../lib/types';
import { KanbanBoard } from '../components/KanbanBoard';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskBoardFilters, applyFilters, type TaskFilters } from '../components/TaskBoardFilters';
import { EditProjectModal } from '../components/EditProjectModal';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

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
};

export function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);

  const workspace = getActiveWorkspace();
  const canDelete = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const canManage = canDelete;

  useEffect(() => {
    if (projectId && workspaceId) {
      loadData();
    }
  }, [projectId, workspaceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, tasksRes, membersRes] = await Promise.all([
        api.get<{ data: Project }>(`/workspaces/${workspaceId}/projects/${projectId}`),
        api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`),
        api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`),
      ]);
      setProject(projectRes.data.data);
      setTasks(tasksRes.data.data);
      setMembers(membersRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    const previous = [...tasks];
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      const { data: res } = await api.patch<{ data: Task }>(`/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      setTasks(previous);
      setError(getErrorMessage(err));
    }
  };

  const handleCreate = async (data: {
    title: string;
    description?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
  }) => {
    const { data: res } = await api.post<{ data: Task }>(`/projects/${projectId}/tasks`, data);
    setTasks([...tasks, res.data]);
  };

  const handleUpdate = async (id: string, data: Partial<Task>) => {
    const { data: res } = await api.patch<{ data: Task }>(`/tasks/${id}`, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    setSelectedTask(res.data);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setTasks(tasks.filter((t) => t.id !== id));
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
    const { data: res } = await api.patch<{ data: Project }>(`/projects/${projectId}`, data);
    setProject(res.data);
  };

  const counts = {
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  };
  const progress = tasks.length > 0 ? Math.round((counts.DONE / tasks.length) * 100) : 0;

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

          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="w-4 h-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}

      <TaskBoardFilters
        tasks={tasks}
        members={members}
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
        onSubmit={handleCreate}
      />

      <TaskDetailModal
        task={selectedTask}
        members={members}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleUpdate}
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
