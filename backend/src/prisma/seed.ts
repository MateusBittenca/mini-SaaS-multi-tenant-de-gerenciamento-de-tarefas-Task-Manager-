import bcrypt from 'bcrypt';
import { PrismaClient, Role, TaskPriority, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('demo123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { passwordHash },
    create: {
      name: 'Demo User',
      email: 'demo@example.com',
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-inc' },
    update: {},
    create: {
      name: 'Acme Inc',
      slug: 'acme-inc',
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: Role.OWNER,
    },
  });

  await prisma.task.deleteMany({
    where: { project: { workspaceId: workspace.id } },
  });
  await prisma.project.deleteMany({ where: { workspaceId: workspace.id } });

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Website Redesign',
        description: 'Redesign the company website with modern UI/UX',
      },
    }),
    prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Mobile App',
        description: 'Build the iOS and Android mobile application',
      },
    }),
    prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'API Integration',
        description: 'Integrate third-party APIs and webhooks',
      },
    }),
  ]);

  const tasksData = [
    { projectId: projects[0].id, title: 'Create wireframes', status: TaskStatus.DONE, priority: TaskPriority.HIGH },
    { projectId: projects[0].id, title: 'Design homepage mockup', status: TaskStatus.DONE, priority: TaskPriority.HIGH },
    { projectId: projects[0].id, title: 'Implement responsive layout', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM },
    { projectId: projects[0].id, title: 'Add dark mode support', status: TaskStatus.TODO, priority: TaskPriority.LOW },
    { projectId: projects[0].id, title: 'Optimize images', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM },
    { projectId: projects[1].id, title: 'Setup React Native project', status: TaskStatus.DONE, priority: TaskPriority.HIGH },
    { projectId: projects[1].id, title: 'Implement authentication flow', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH },
    { projectId: projects[1].id, title: 'Build dashboard screen', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM },
    { projectId: projects[1].id, title: 'Add push notifications', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM },
    { projectId: projects[1].id, title: 'Write unit tests', status: TaskStatus.TODO, priority: TaskPriority.LOW },
    { projectId: projects[2].id, title: 'Document API endpoints', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM },
    { projectId: projects[2].id, title: 'Setup Stripe webhooks', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH },
    { projectId: projects[2].id, title: 'Integrate SendGrid', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM },
    { projectId: projects[2].id, title: 'Add rate limiting', status: TaskStatus.TODO, priority: TaskPriority.HIGH },
    { projectId: projects[2].id, title: 'Create integration tests', status: TaskStatus.TODO, priority: TaskPriority.LOW },
  ];

  for (const [index, task] of tasksData.entries()) {
    await prisma.task.create({
      data: {
        ...task,
        assigneeId: index % 2 === 0 ? user.id : null,
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log('Demo credentials: demo@example.com / demo123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
