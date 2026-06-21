import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Circle, Loader, ListTodo, Inbox } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { downloadExport } from '../lib/download';
import { isOverdue } from '../lib/dates';
import { useMyTasks } from '../hooks/queries/task';
import type { Task, TaskStatus } from '../lib/types';
import { Alert } from '../components/Alert';
import { ExportMenu } from '../components/ExportMenu';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; className: string }> = {
  TODO: { label: 'A fazer', icon: Circle, className: 'text-espresso-muted' },
  IN_PROGRESS: { label: 'Em progresso', icon: Loader, className: 'text-amber-warm' },
  DONE: { label: 'Concluídas', icon: CheckCircle2, className: 'text-sage' },
};

function TaskRow({ task, workspaceId }: { task: Task; workspaceId: string }) {
  const overdue = isOverdue(task.dueDate, task.status);
  const StatusIcon = statusConfig[task.status].icon;

  return (
    <Link
      to={`/w/${workspaceId}/projects/${task.projectId}`}
      className="flex items-center gap-4 p-4 bg-surface border border-sand rounded-xl hover:border-terracotta/25 transition-colors group"
    >
      <StatusIcon className={`w-4 h-4 shrink-0 ${statusConfig[task.status].className}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-espresso truncate group-hover:text-terracotta transition-colors">
          {task.title}
        </p>
        <p className="text-xs text-espresso-faint mt-0.5">{task.project?.name}</p>
      </div>
      {task.dueDate && (
        <span
          className={`text-xs shrink-0 ${overdue ? 'text-danger font-medium' : 'text-espresso-faint'}`}
        >
          {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </Link>
  );
}

export function MyTasksPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: tasks = [], isLoading, error } = useMyTasks(workspaceId);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!workspaceId) return;
    setExporting(true);
    try {
      await downloadExport(`/workspaces/${workspaceId}/tasks/mine/export`, { format });
    } finally {
      setExporting(false);
    }
  };

  const sections = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const overdue = tasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now
    );
    const overdueIds = new Set(overdue.map((t) => t.id));
    const inProgress = tasks.filter(
      (t) => t.status === 'IN_PROGRESS' && !overdueIds.has(t.id)
    );
    const todo = tasks.filter((t) => t.status === 'TODO' && !overdueIds.has(t.id));
    const doneRecent = tasks.filter(
      (t) => t.status === 'DONE' && new Date(t.updatedAt) >= weekAgo
    );

    return [
      { key: 'overdue', title: 'Atrasadas', tasks: overdue },
      { key: 'in_progress', title: 'Em progresso', tasks: inProgress },
      { key: 'todo', title: 'A fazer', tasks: todo },
      { key: 'done', title: 'Concluídas esta semana', tasks: doneRecent },
    ].filter((s) => s.tasks.length > 0);
  }, [tasks]);

  if (isLoading) {
    return <LoadingSkeleton variant="list" rows={5} />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-terracotta-light flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-terracotta" />
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
                Minhas tarefas
              </h1>
            </div>
            <p className="text-espresso-muted text-sm">
              Tarefas atribuídas a você neste workspace.
            </p>
          </div>
          {tasks.length > 0 && <ExportMenu onExport={handleExport} loading={exporting} />}
        </div>
      </div>

      {error && <Alert className="mb-6">{getErrorMessage(error)}</Alert>}

      {tasks.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhuma tarefa atribuída"
          description="Quando alguém atribuir uma tarefa a você, ela aparecerá aqui."
        />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="text-sm font-semibold text-espresso-muted uppercase tracking-wide mb-3">
                {section.title}
                <span className="ml-2 text-espresso-faint font-normal">({section.tasks.length})</span>
              </h2>
              <div className="space-y-2">
                {section.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} workspaceId={workspaceId!} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
