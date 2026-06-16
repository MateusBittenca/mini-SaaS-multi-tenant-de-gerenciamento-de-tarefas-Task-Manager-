import { test, expect } from '@playwright/test';

const TASK_TITLE = `E2E Calendar ${Date.now()}`;

test('calendário: criar tarefa com prazo e visualizar no calendário', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Senha').fill('demo123456');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/workspaces/);
  await page.getByText('Acme Inc').click();

  await page.getByRole('link', { name: 'Website Redesign' }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);

  await page.getByRole('button', { name: /Nova tarefa/ }).click();
  await page.getByLabel('Título').fill(TASK_TITLE);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateValue = tomorrow.toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(dateValue);

  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByText(TASK_TITLE)).toBeVisible();

  await page.getByTestId('calendar-view-toggle').click();

  const dateKey = dateValue;
  const dayCell = page.getByTestId(`calendar-day-${dateKey}`);
  await expect(dayCell.getByText(TASK_TITLE)).toBeVisible();

  await dayCell.getByText(TASK_TITLE).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Título')).toHaveValue(TASK_TITLE);
});
