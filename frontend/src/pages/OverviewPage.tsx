import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, CalendarClock, CheckCircle2, Circle, FolderKanban, Loader, Users } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useOverview } from '../hooks/queries/workspace';
import type { TaskStatus } from '../lib/types';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const statusMeta: Record<
  TaskStatus,
  { label: string; icon: typeof Circle; barClass: string }
> = {
  TODO: { label: 'A fazer', icon: Circle, barClass: 'bg-espresso-faint' },
  IN_PROGRESS: { label: 'Em progresso', icon: Loader, barClass: 'bg-amber-warm' },
  DONE: { label: 'Concluídas', icon: CheckCircle2, barClass: 'bg-sage' },
};

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function OverviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const { data: overview, isLoading, error } = useOverview(workspaceId);

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [workspaceId, setActiveWorkspace]);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-8 w-56 rounded-lg mb-8" />
        <LoadingSkeleton variant="cards" rows={4} />
      </div>
    );
  }

  if (!overview) {
    return error ? <Alert>{getErrorMessage(error)}</Alert> : null;
  }

  const maxStatus = Math.max(...Object.values(overview.tasksByStatus), 1);
  const maxMember = Math.max(...overview.tasksByMember.map((m) => m.count), 1);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
          Visão geral
        </h1>
        <p className="text-espresso-muted mt-1.5 text-sm">
          {overview.totalProjects} {overview.totalProjects === 1 ? 'projeto' : 'projetos'} ·{' '}
          {overview.totalTasks} {overview.totalTasks === 1 ? 'tarefa' : 'tarefas'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <section className="bg-surface border border-sand rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-lg font-semibold text-espresso">Por status</h2>
          </div>
          <div className="space-y-4">
            {(Object.keys(statusMeta) as TaskStatus[]).map((status) => {
              const meta = statusMeta[status];
              const Icon = meta.icon;
              const count = overview.tasksByStatus[status];
              const pct = overview.totalTasks > 0 ? (count / overview.totalTasks) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-espresso-muted">
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    <span className="font-medium text-espresso">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-sand overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${meta.barClass}`}
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-espresso-faint mt-1">{Math.round(pct)}% do total</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border border-sand rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-lg font-semibold text-espresso">Por membro</h2>
          </div>
          {overview.tasksByMember.length === 0 ? (
            <p className="text-sm text-espresso-faint">Nenhuma tarefa atribuída ainda.</p>
          ) : (
            <ul className="space-y-3">
              {overview.tasksByMember.slice(0, 8).map((member) => (
                <li key={member.userId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-espresso">{member.name}</span>
                    <span className="font-medium text-espresso-muted">{member.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-sand overflow-hidden">
                    <div
                      className="h-full rounded-full bg-terracotta"
                      style={{ width: `${(member.count / maxMember) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-surface border border-sand rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <FolderKanban className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-lg font-semibold text-espresso">Projetos mais ativos</h2>
          </div>
          {overview.topProjects.length === 0 ? (
            <p className="text-sm text-espresso-faint">Nenhum projeto criado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {overview.topProjects.map((project, i) => (
                <li key={project.id}>
                  <Link
                    to={`/w/${workspaceId}/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 -mx-3 hover:bg-cream-dark transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-espresso min-w-0">
                      <span className="text-espresso-faint text-xs w-4 shrink-0">{i + 1}.</span>
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span className="text-xs font-medium text-espresso-muted shrink-0">
                      {project.taskCount} {project.taskCount === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-sand rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <CalendarClock className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-lg font-semibold text-espresso">Vencendo em 7 dias</h2>
          </div>
          {overview.dueSoon.length === 0 ? (
            <p className="text-sm text-espresso-faint">Nenhuma tarefa com prazo nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-2">
              {overview.dueSoon.map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/w/${workspaceId}/projects/${task.project.id}`}
                    className="block rounded-lg px-3 py-2.5 -mx-3 hover:bg-cream-dark transition-colors"
                  >
                    <p className="text-sm font-medium text-espresso truncate">{task.title}</p>
                    <p className="text-xs text-espresso-faint mt-0.5">
                      {task.project.name}
                      {task.assignee ? ` · ${task.assignee.name}` : ''}
                      {' · '}
                      <span className="text-terracotta">{formatDueDate(task.dueDate)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
