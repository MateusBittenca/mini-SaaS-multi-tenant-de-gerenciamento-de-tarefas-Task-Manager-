import { Link } from 'react-router-dom';
import { ArrowRight, Trash2, CheckSquare } from 'lucide-react';
import type { Project } from '../lib/types';

interface ProjectCardProps {
  project: Project;
  workspaceId: string;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function ProjectCard({ project, workspaceId, onDelete, canDelete }: ProjectCardProps) {
  const taskCount = project._count?.tasks ?? 0;

  return (
    <div
      className="group relative bg-surface border border-sand rounded-2xl p-6 transition-all hover:border-terracotta/25 hover:-translate-y-0.5"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-terracotta-light border border-terracotta/15 flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
        </div>
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(project.id);
            }}
            className="p-1.5 rounded-lg text-espresso-faint hover:text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Excluir projeto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <Link to={`/w/${workspaceId}/projects/${project.id}`} className="block">
        <h3 className="font-display text-lg font-semibold text-espresso group-hover:text-terracotta transition-colors mb-1.5">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-sm text-espresso-muted line-clamp-2 mb-4">{project.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-espresso-faint">
            {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-terracotta opacity-0 group-hover:opacity-100 transition-opacity">
            Abrir board
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
