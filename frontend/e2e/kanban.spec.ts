import { test, expect } from '@playwright/test';

const TASK_TITLE = `E2E Task ${Date.now()}`;

test('fluxo completo: login, workspace, projeto, criar tarefa e mover no kanban', async ({
  page,
}) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Senha').fill('demo123456');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/workspaces/);
  await page.getByText('Acme Inc').click();

  await expect(page).toHaveURL(/\/w\/.+/);
  await page.getByRole('link', { name: 'Website Redesign' }).click();

  await expect(page).toHaveURL(/\/projects\/.+/);
  await page.getByRole('button', { name: /Nova tarefa/ }).click();

  await page.getByLabel('Título').fill(TASK_TITLE);
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  const todoColumn = page.getByTestId('kanban-column-TODO');
  const progressColumn = page.getByTestId('kanban-column-IN_PROGRESS');

  await expect(todoColumn.getByText(TASK_TITLE)).toBeVisible();

  await todoColumn.getByText(TASK_TITLE).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('select').first().selectOption('IN_PROGRESS');

  const saveResponse = page.waitForResponse(
    (res) => res.request().method() === 'PATCH' && res.url().includes('/tasks/')
  );
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await saveResponse;
  await expect(dialog).not.toBeVisible();

  await expect(progressColumn.getByText(TASK_TITLE)).toBeVisible();
  await expect(todoColumn.getByText(TASK_TITLE)).not.toBeVisible();
});
