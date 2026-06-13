import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Circle, Loader, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Project, Task, TaskStatus } from '../lib/types';
import { KanbanBoard } from '../components/KanbanBoard';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const statusMeta: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  TODO: { label: 'A fazer', icon: Circle, color: '#6B5E54' },
  IN_PROGRESS: { label: 'Em progresso', icon: Loader, color: '#D4924A' },
  DONE: { label: 'Concluídas', icon: CheckCircle2, color: '#5A7A6A' },
};

export function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const workspace = getActiveWorkspace();
  const canDelete = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  useEffect(() => {
    if (projectId && workspaceId) {
      loadData();
    }
  }, [projectId, workspaceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, tasksRes] = await Promise.all([
        api.get<{ data: Project }>(`/workspaces/${workspaceId}/projects/${projectId}`),
        api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`),
      ]);
      setProject(projectRes.data.data);
      setTasks(tasksRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreate = async (data: { title: string; description?: string; priority?: string }) => {
    const { data: res } = await api.post<{ data: Task }>(`/projects/${projectId}/tasks`, data);
    setTasks([...tasks, res.data]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
      {/* Project header */}
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
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-espresso-muted mt-1.5 text-sm max-w-xl">{project.description}</p>
            )}

            {/* Stats row */}
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

      <KanbanBoard
        tasks={tasks}
        onStatusChange={handleStatusChange}
        onDeleteTask={handleDelete}
        canDelete={canDelete}
      />

      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
