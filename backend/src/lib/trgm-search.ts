import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from './prisma';

const SEARCH_LIMIT = 20;
const MIN_SIMILARITY = 0.2;

function toLikePattern(query: string): string {
  const escaped = query.replace(/[%_\\]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

type TaskSearchRow = {
  id: string;
  title: string;
  status: TaskStatus;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

type ProjectSearchRow = {
  id: string;
  name: string;
  description: string | null;
};

export async function searchTasksInWorkspace(workspaceId: string, query: string) {
  const pattern = toLikePattern(query);

  const rows = await prisma.$queryRaw<TaskSearchRow[]>(Prisma.sql`
    SELECT
      t.id,
      t.title,
      t.status,
      t."projectId",
      p.name AS "projectName",
      u.id AS "assigneeId",
      u.name AS "assigneeName"
    FROM "Task" t
    INNER JOIN "Project" p ON p.id = t."projectId"
    LEFT JOIN "User" u ON u.id = t."assigneeId"
    WHERE p."workspaceId" = ${workspaceId}
      AND t."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
      AND (
        t.title ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(t.description, '') ILIKE ${pattern} ESCAPE '\\'
        OR similarity(t.title, ${query}) > ${MIN_SIMILARITY}
        OR similarity(COALESCE(t.description, ''), ${query}) > ${MIN_SIMILARITY}
      )
    ORDER BY GREATEST(
      word_similarity(${query}, t.title),
      word_similarity(${query}, COALESCE(t.description, ''))
    ) DESC
    LIMIT ${SEARCH_LIMIT}
  `);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    projectId: row.projectId,
    projectName: row.projectName,
    assignee: row.assigneeId ? { id: row.assigneeId, name: row.assigneeName! } : null,
  }));
}

export async function searchProjectsInWorkspace(workspaceId: string, query: string) {
  const pattern = toLikePattern(query);

  const rows = await prisma.$queryRaw<ProjectSearchRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.name,
      p.description
    FROM "Project" p
    WHERE p."workspaceId" = ${workspaceId}
      AND p."deletedAt" IS NULL
      AND (
        p.name ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(p.description, '') ILIKE ${pattern} ESCAPE '\\'
        OR similarity(p.name, ${query}) > ${MIN_SIMILARITY}
        OR similarity(COALESCE(p.description, ''), ${query}) > ${MIN_SIMILARITY}
      )
    ORDER BY GREATEST(
      word_similarity(${query}, p.name),
      word_similarity(${query}, COALESCE(p.description, ''))
    ) DESC
    LIMIT ${SEARCH_LIMIT}
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
  }));
}
