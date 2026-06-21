import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { REFRESH_COOKIE_NAME, verifyRefreshToken } from '../lib/jwt';
import {
  app,
  request,
  createUser,
  createWorkspaceWithOwner,
  addMember,
  authHeader,
  workspaceHeader,
} from './helpers';

function parseRefreshCookie(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const refresh = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!refresh) throw new Error('No refresh cookie');
  return refresh.split(';')[0].split('=')[1];
}

describe('API integration', () => {
  it('registra e faz login de usuário', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.email).toBe('test@example.com');
    expect(registerRes.body.data.accessToken).toBeDefined();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  it('rotaciona refresh token no endpoint /refresh', async () => {
    const agent = request.agent(app);

    const registerRes = await agent.post('/api/auth/register').send({
      name: 'Refresh User',
      email: 'refresh@example.com',
      password: 'password123',
    });

    expect(registerRes.status).toBe(201);
    const oldToken = parseRefreshCookie(registerRes.headers['set-cookie']);

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    const newToken = parseRefreshCookie(refreshRes.headers['set-cookie']);
    expect(newToken).not.toBe(oldToken);

    const { jti: oldJti } = verifyRefreshToken(oldToken);
    const oldRecord = await prisma.refreshToken.findUnique({ where: { id: oldJti } });
    expect(oldRecord?.revokedAt).not.toBeNull();
  });

  it('detecta reuso de refresh token e invalida familia', async () => {
    const agent = request.agent(app);

    const registerRes = await agent.post('/api/auth/register').send({
      name: 'Reuse User',
      email: 'reuse@example.com',
      password: 'password123',
    });

    const stolenToken = parseRefreshCookie(registerRes.headers['set-cookie']);

    await agent.post('/api/auth/refresh');

    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${stolenToken}`);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('TOKEN_REUSE');

    const afterTheftRes = await agent.post('/api/auth/refresh');
    expect(afterTheftRes.status).toBe(401);
  });

  it('revoga refresh token no logout', async () => {
    const agent = request.agent(app);

    const registerRes = await agent.post('/api/auth/register').send({
      name: 'Logout User',
      email: 'logout@example.com',
      password: 'password123',
    });

    const token = parseRefreshCookie(registerRes.headers['set-cookie']);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const refreshRes = await agent
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${token}`);
    expect(refreshRes.status).toBe(401);

    const { jti } = verifyRefreshToken(token);
    const record = await prisma.refreshToken.findUnique({ where: { id: jti } });
    expect(record?.revokedAt).not.toBeNull();
  });

  it('isola dados entre workspaces', async () => {
    const userA = await createUser('usera@example.com', 'User A');
    const userB = await createUser('userb@example.com', 'User B');
    const wsA = await createWorkspaceWithOwner(userA.id, 'Workspace A');
    const wsB = await createWorkspaceWithOwner(userB.id, 'Workspace B');

    const projectB = await prisma.project.create({
      data: { workspaceId: wsB.id, name: 'Secret Project' },
    });

    const res = await request(app)
      .get(`/api/workspaces/${wsB.id}/projects`)
      .set(authHeader(userA.id, userA.email))
      .set(workspaceHeader(wsB.id));

    expect(res.status).toBe(403);
    expect(projectB.workspaceId).toBe(wsB.id);
  });

  it('cria projeto e tarefa', async () => {
    const user = await createUser('creator@example.com', 'Creator');
    const workspace = await createWorkspaceWithOwner(user.id);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace.id}/projects`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id))
      .send({ name: 'My Project', description: 'Desc' });

    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.data.id;

    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id))
      .send({ title: 'My Task', priority: 'HIGH' });

    expect(taskRes.status).toBe(201);
    expect(taskRes.body.data.title).toBe('My Task');
  });

  it('pagina listagem de tarefas por cursor', async () => {
    const user = await createUser('pager@example.com', 'Pager');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'Paginated Project' },
    });

    for (let i = 1; i <= 3; i++) {
      await prisma.task.create({
        data: { projectId: project.id, title: `Task ${i}` },
      });
    }

    const page1 = await request(app)
      .get(`/api/projects/${project.id}/tasks?limit=2`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(page1.status).toBe(200);
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.hasMore).toBe(true);
    expect(page1.body.data.nextCursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/api/projects/${project.id}/tasks?limit=2&cursor=${page1.body.data.nextCursor}`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.hasMore).toBe(false);
    expect(page2.body.data.nextCursor).toBeNull();
  });

  it('impede MEMBER de deletar projeto', async () => {
    const owner = await createUser('owner@example.com', 'Owner');
    const member = await createUser('member@example.com', 'Member');
    const workspace = await createWorkspaceWithOwner(owner.id);
    await addMember(workspace.id, member.id, Role.MEMBER);

    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'Protected' },
    });

    const res = await request(app)
      .delete(`/api/projects/${project.id}`)
      .set(authHeader(member.id, member.email))
      .set(workspaceHeader(workspace.id));

    expect(res.status).toBe(403);
  });

  it('convida e aceita membro no workspace', async () => {
    const owner = await createUser('invite-owner@example.com', 'Owner');
    const invitee = await createUser('invitee@example.com', 'Invitee');
    const workspace = await createWorkspaceWithOwner(owner.id);

    const inviteRes = await request(app)
      .post(`/api/workspaces/${workspace.id}/invite`)
      .set(authHeader(owner.id, owner.email))
      .set(workspaceHeader(workspace.id))
      .send({ email: invitee.email, role: Role.MEMBER });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.data.token).toBeDefined();

    const acceptRes = await request(app)
      .post(`/api/workspaces/invites/${inviteRes.body.data.token}/accept`)
      .set(authHeader(invitee.id, invitee.email));

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.workspaceId).toBe(workspace.id);
  });

  it('cria notificação ao atribuir tarefa', async () => {
    const owner = await createUser('assign-owner@example.com', 'Owner');
    const assignee = await createUser('assignee@example.com', 'Assignee');
    const workspace = await createWorkspaceWithOwner(owner.id);
    await addMember(workspace.id, assignee.id, Role.MEMBER);

    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'P' },
    });

    const taskRes = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(authHeader(owner.id, owner.email))
      .set(workspaceHeader(workspace.id))
      .send({ title: 'Assigned Task', assigneeId: assignee.id });

    expect(taskRes.status).toBe(201);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set(authHeader(assignee.id, assignee.email));

    expect(notifRes.status).toBe(200);
    const notifications = notifRes.body.data.notifications;
    expect(notifications.some((n: { type: string }) => n.type === 'TASK_ASSIGNED')).toBe(true);
  });

  it('cria comentário em tarefa', async () => {
    const owner = await createUser('comment-owner@example.com', 'Owner');
    const assignee = await createUser('comment-assignee@example.com', 'Assignee');
    const workspace = await createWorkspaceWithOwner(owner.id);
    await addMember(workspace.id, assignee.id, Role.MEMBER);

    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'P' },
    });
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: 'Task',
        assigneeId: assignee.id,
      },
    });

    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(authHeader(owner.id, owner.email))
      .set(workspaceHeader(workspace.id))
      .send({ content: 'Ótimo trabalho!' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('Ótimo trabalho!');

    const notifRes = await request(app)
      .get('/api/notifications')
      .set(authHeader(assignee.id, assignee.email));

    expect(
      notifRes.body.data.notifications.some((n: { type: string }) => n.type === 'TASK_COMMENTED')
    ).toBe(true);
  });

  it('busca global no workspace', async () => {
    const user = await createUser('search@example.com', 'Searcher');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'Alpha Project', description: 'beta terms' },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: 'Find me gamma', description: 'delta' },
    });

    const res = await request(app)
      .get(`/api/workspaces/${workspace.id}/search`)
      .query({ q: 'gamma' })
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThan(0);
    expect(res.body.data.tasks[0].title).toContain('gamma');

    const fuzzyRes = await request(app)
      .get(`/api/workspaces/${workspace.id}/search`)
      .query({ q: 'gama' })
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(fuzzyRes.status).toBe(200);
    expect(fuzzyRes.body.data.tasks.some((t: { title: string }) => t.title.includes('gamma'))).toBe(
      true
    );
  });

  it('CRUD de subtarefas', async () => {
    const user = await createUser('subtask@example.com', 'Subtask User');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'P' },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Parent Task' },
    });

    const createRes = await request(app)
      .post(`/api/tasks/${task.id}/subtasks`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id))
      .send({ title: 'Step one' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Step one');
    const subtaskId = createRes.body.data.id;

    const listRes = await request(app)
      .get(`/api/tasks/${task.id}/subtasks`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const toggleRes = await request(app)
      .patch(`/api/subtasks/${subtaskId}`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id))
      .send({ completed: true });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.completed).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/subtasks/${subtaskId}`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(deleteRes.status).toBe(200);
  });

  it('isola subtarefas entre workspaces', async () => {
    const userA = await createUser('suba@example.com', 'User A');
    const userB = await createUser('subb@example.com', 'User B');
    const wsA = await createWorkspaceWithOwner(userA.id);
    const wsB = await createWorkspaceWithOwner(userB.id);

    const project = await prisma.project.create({
      data: { workspaceId: wsA.id, name: 'P' },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Task' },
    });
    const subtask = await prisma.subtask.create({
      data: { taskId: task.id, title: 'Item' },
    });

    const res = await request(app)
      .get(`/api/tasks/${task.id}/subtasks`)
      .set(authHeader(userB.id, userB.email))
      .set(workspaceHeader(wsB.id));

    expect(res.status).toBe(404);

    const patchRes = await request(app)
      .patch(`/api/subtasks/${subtask.id}`)
      .set(authHeader(userB.id, userB.email))
      .set(workspaceHeader(wsB.id))
      .send({ completed: true });

    expect(patchRes.status).toBe(404);
  });

  it('soft delete: task deletada não aparece na listagem', async () => {
    const user = await createUser('cascade@example.com', 'Cascade User');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'P' },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Task' },
    });
    await prisma.subtask.create({
      data: { taskId: task.id, title: 'Item' },
    });

    const deleteRes = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set(authHeader(user.id, user.email))
      .set('X-Workspace-Id', workspace.id);

    expect(deleteRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/projects/${project.id}/tasks`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items).toHaveLength(0);

    const deleted = await prisma.task.findUnique({ where: { id: task.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });

  it('soft delete: projeto deletado some da listagem e leva tarefas junto', async () => {
    const user = await createUser('softdel@example.com', 'Soft Delete');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'To Delete' },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Orphan Task' },
    });

    const deleteRes = await request(app)
      .delete(`/api/projects/${project.id}`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(deleteRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/workspaces/${workspace.id}/projects`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items).toHaveLength(0);

    const deletedProject = await prisma.project.findUnique({ where: { id: project.id } });
    const deletedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(deletedProject?.deletedAt).not.toBeNull();
    expect(deletedTask?.deletedAt).not.toBeNull();
  });

  it('CRUD de tags e associação com tarefas', async () => {
    const admin = await createUser('tag-admin@example.com', 'Tag Admin');
    const member = await createUser('tag-member@example.com', 'Tag Member');
    const workspace = await createWorkspaceWithOwner(admin.id);
    await addMember(workspace.id, member.id, Role.MEMBER);

    const createTagRes = await request(app)
      .post(`/api/workspaces/${workspace.id}/tags`)
      .set(authHeader(admin.id, admin.email))
      .set(workspaceHeader(workspace.id))
      .send({ name: 'Bug', color: '#C45C3E' });

    expect(createTagRes.status).toBe(201);
    const tagId = createTagRes.body.data.id;

    const memberCreateRes = await request(app)
      .post(`/api/workspaces/${workspace.id}/tags`)
      .set(authHeader(member.id, member.email))
      .set(workspaceHeader(workspace.id))
      .send({ name: 'Feature', color: '#5A7A6A' });

    expect(memberCreateRes.status).toBe(403);

    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'P' },
    });

    const taskRes = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(authHeader(admin.id, admin.email))
      .set(workspaceHeader(workspace.id))
      .send({ title: 'Tagged Task', tagIds: [tagId] });

    expect(taskRes.status).toBe(201);
    expect(taskRes.body.data.tags).toHaveLength(1);
    expect(taskRes.body.data.tags[0].name).toBe('Bug');

    const dupRes = await request(app)
      .post(`/api/workspaces/${workspace.id}/tags`)
      .set(authHeader(admin.id, admin.email))
      .set(workspaceHeader(workspace.id))
      .send({ name: 'Bug', color: '#000000' });

    expect(dupRes.status).toBe(409);

    const otherWs = await createWorkspaceWithOwner(member.id);
    const foreignTag = await prisma.tag.create({
      data: { workspaceId: otherWs.id, name: 'Foreign', color: '#111111' },
    });

    const invalidTaskRes = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(authHeader(admin.id, admin.email))
      .set(workspaceHeader(workspace.id))
      .send({ title: 'Bad Tags', tagIds: [foreignTag.id] });

    expect(invalidTaskRes.status).toBe(400);

    const deleteRes = await request(app)
      .delete(`/api/tags/${tagId}`)
      .set(authHeader(admin.id, admin.email))
      .set(workspaceHeader(workspace.id));

    expect(deleteRes.status).toBe(200);
  });

  it('upload e download de anexos em tarefa', async () => {
    const user = await createUser('attach@example.com', 'Attach User');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'Attachments' },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Task with file' },
    });

    const uploadRes = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id))
      .attach('file', Buffer.from('hello attachment'), 'notes.txt');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.filename).toBe('notes.txt');
    const attachmentId = uploadRes.body.data.id;

    const listRes = await request(app)
      .get(`/api/tasks/${task.id}/attachments`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const downloadRes = await request(app)
      .get(`/api/tasks/${task.id}/attachments/${attachmentId}/download`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe('hello attachment');

    const deleteRes = await request(app)
      .delete(`/api/tasks/${task.id}/attachments/${attachmentId}`)
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(deleteRes.status).toBe(200);
  });

  it('exporta tarefas do projeto em CSV', async () => {
    const user = await createUser('export@example.com', 'Export User');
    const workspace = await createWorkspaceWithOwner(user.id);
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, name: 'Export Project' },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: 'Exportable Task', status: 'TODO' },
    });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks/export`)
      .query({ format: 'csv' })
      .set(authHeader(user.id, user.email))
      .set(workspaceHeader(workspace.id));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Exportable Task');
    expect(res.text).toContain('A fazer');
  });
});
