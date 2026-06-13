import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderPlus, Plus } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Project } from '../lib/types';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const workspace = getActiveWorkspace();
  const canDelete = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspace(workspaceId);
      loadProjects();
    }
  }, [workspaceId]);

  const loadProjects = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get<{ data: Project[] }>(
        `/workspaces/${workspaceId}/projects`
      );
      setProjects(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; description?: string }) => {
    const { data: res } = await api.post<{ data: Project }>(
      `/workspaces/${workspaceId}/projects`,
      data
    );
    setProjects([res.data, ...projects]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
            Projetos
          </h1>
          <p className="text-espresso-muted mt-1.5 text-sm">
            {projects.length > 0
              ? `${projects.length} ${projects.length === 1 ? 'projeto ativo' : 'projetos ativos'} neste workspace`
              : 'Organize o trabalho em projetos com boards Kanban'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo projeto</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}

      {loading ? (
        <LoadingSkeleton variant="cards" rows={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto e comece a organizar tarefas no board Kanban."
          action={{ label: 'Criar projeto', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspaceId!}
              onDelete={handleDelete}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
