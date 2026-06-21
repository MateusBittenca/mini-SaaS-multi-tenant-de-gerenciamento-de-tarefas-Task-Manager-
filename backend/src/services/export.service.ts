import PDFDocument from 'pdfkit';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { activeOnly, activeProjectInWorkspace, activeTaskInWorkspace } from '../lib/soft-delete';
import { TaskExportQuery } from '../schemas/export.schema';

type ExportTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdAt: Date;
  assignee: { name: string } | null;
  tags: { name: string }[];
  project?: { name: string };
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em progresso',
  DONE: 'Concluída',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

function applySearchFilter<T extends ExportTask>(tasks: T[], search?: string): T[] {
  const q = search?.trim().toLowerCase();
  if (!q) return tasks;

  return tasks.filter((task) => {
    const inTitle = task.title.toLowerCase().includes(q);
    const inDescription = task.description?.toLowerCase().includes(q);
    return inTitle || !!inDescription;
  });
}

async function fetchProjectTasks(projectId: string, workspaceId: string, filters: TaskExportQuery) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...activeProjectInWorkspace(workspaceId) },
    select: { id: true, name: true },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...activeOnly,
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.status && { status: filters.status }),
      ...(filters.tagId && { tags: { some: { id: filters.tagId } } }),
    },
    include: {
      assignee: { select: { name: true } },
      tags: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    project,
    tasks: filters.search ? applySearchFilter(tasks, filters.search) : tasks,
  };
}

async function fetchMyTasks(workspaceId: string, userId: string, filters: TaskExportQuery) {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      ...activeTaskInWorkspace(workspaceId),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.status && { status: filters.status }),
      ...(filters.tagId && { tags: { some: { id: filters.tagId } } }),
    },
    include: {
      assignee: { select: { name: true } },
      tags: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  return filters.search ? applySearchFilter(tasks, filters.search) : tasks;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(value: Date | null): string {
  if (!value) return '';
  return value.toLocaleDateString('pt-BR');
}

export async function exportProjectTasks(
  projectId: string,
  workspaceId: string,
  filters: TaskExportQuery
) {
  const { project, tasks } = await fetchProjectTasks(projectId, workspaceId, filters);
  const filenameBase = `${project.name.replace(/[^\w\-]+/g, '_')}_tarefas`;

  if (filters.format === 'csv') {
    const header = ['Título', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Tags', 'Descrição', 'Criada em'];
    const rows = tasks.map((task) => [
      task.title,
      STATUS_LABELS[task.status],
      PRIORITY_LABELS[task.priority],
      task.assignee?.name ?? '',
      formatDate(task.dueDate),
      task.tags.map((t) => t.name).join('; '),
      task.description ?? '',
      formatDate(task.createdAt),
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${filenameBase}.csv`,
      body: Buffer.from(`\uFEFF${csv}`, 'utf-8'),
    };
  }

  const body = await buildPdfBuffer(project.name, tasks);
  return {
    contentType: 'application/pdf',
    filename: `${filenameBase}.pdf`,
    body,
  };
}

export async function exportMyTasks(
  workspaceId: string,
  userId: string,
  filters: TaskExportQuery
) {
  const tasks = await fetchMyTasks(workspaceId, userId, filters);
  const filenameBase = 'minhas_tarefas';

  if (filters.format === 'csv') {
    const header = ['Título', 'Projeto', 'Status', 'Prioridade', 'Prazo', 'Tags', 'Descrição'];
    const rows = tasks.map((task) => [
      task.title,
      task.project?.name ?? '',
      STATUS_LABELS[task.status],
      PRIORITY_LABELS[task.priority],
      formatDate(task.dueDate),
      task.tags.map((t) => t.name).join('; '),
      task.description ?? '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${filenameBase}.csv`,
      body: Buffer.from(`\uFEFF${csv}`, 'utf-8'),
    };
  }

  const body = await buildPdfBuffer('Minhas tarefas', tasks);
  return {
    contentType: 'application/pdf',
    filename: `${filenameBase}.pdf`,
    body,
  };
}

function buildPdfBuffer(title: string, tasks: ExportTask[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown();

    if (tasks.length === 0) {
      doc.fillColor('#000').fontSize(12).text('Nenhuma tarefa encontrada.');
    } else {
      tasks.forEach((task, index) => {
        if (index > 0) doc.moveDown(0.5);
        doc.fillColor('#000').fontSize(12).text(task.title, { continued: false });
        doc.fontSize(10).fillColor('#444');
        const projectLabel = task.project?.name ? `${task.project.name} · ` : '';
        doc.text(
          `${projectLabel}${STATUS_LABELS[task.status]} · ${PRIORITY_LABELS[task.priority]} · Responsável: ${task.assignee?.name ?? '—'} · Prazo: ${formatDate(task.dueDate) || '—'}`
        );
        if (task.tags.length > 0) {
          doc.text(`Tags: ${task.tags.map((t) => t.name).join(', ')}`);
        }
        if (task.description) {
          doc.text(task.description, { width: 500 });
        }
      });
    }

    doc.end();
  });
}
