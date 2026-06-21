export const activeOnly = { deletedAt: null } as const;

export function activeProjectInWorkspace(workspaceId: string) {
  return { workspaceId, deletedAt: null };
}

export function activeTaskInWorkspace(workspaceId: string) {
  return {
    deletedAt: null,
    project: { workspaceId, deletedAt: null },
  };
}
