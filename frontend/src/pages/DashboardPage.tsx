import { useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderPlus, Plus } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from '../hooks/queries/workspace';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const {
    data,
    isLoading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProjects(workspaceId);

  const createProject = useCreateProject(workspaceId);
  const deleteProject = useDeleteProject(workspaceId);

  const projects = data?.pages.flatMap((page) => page.items) ?? [];

  const openCreate = useCallback(() => setShowCreate(true), []);
  useKeyboardShortcuts([{ key: 'n', handler: openCreate, enabled: !showCreate }]);

  const workspace = getActiveWorkspace();
  const canDelete = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [workspaceId, setActiveWorkspace]);

  const handleCreate = async (data: { name: string; description?: string }) => {
    setError('');
    try {
      await createProject.mutateAsync(data);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    setError('');
    try {
      await deleteProject.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const displayError = error || (queryError ? getErrorMessage(queryError) : '');

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
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo projeto</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {displayError && <Alert className="mb-6">{displayError}</Alert>}

      {isLoading ? (
        <LoadingSkeleton variant="cards" rows={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto e comece a organizar tarefas no board Kanban."
          action={{ label: 'Criar projeto', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-6">
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
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Carregando...' : 'Carregar mais projetos'}
              </Button>
            </div>
          )}
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
