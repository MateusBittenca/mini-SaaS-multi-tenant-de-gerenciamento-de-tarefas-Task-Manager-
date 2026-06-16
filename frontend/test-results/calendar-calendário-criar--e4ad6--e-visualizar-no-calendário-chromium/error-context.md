# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar.spec.ts >> calendário: criar tarefa com prazo e visualizar no calendário
- Location: e2e/calendar.spec.ts:5:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Nova tarefa/ })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - link "Trama" [ref=e7] [cursor=pointer]:
      - /url: /workspaces
      - img [ref=e9]
      - generic [ref=e12]: Trama
    - generic [ref=e13]:
      - paragraph [ref=e14]: Workspace
      - paragraph [ref=e15]: Acme Inc
      - generic [ref=e16]: Proprietário
    - navigation [ref=e17]:
      - link "Visão geral" [ref=e18] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m/overview
        - img [ref=e19]
        - text: Visão geral
      - link "Projetos" [ref=e21] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m
        - img [ref=e22]
        - text: Projetos
      - link "Minhas tarefas" [ref=e27] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m/tasks
        - img [ref=e28]
        - text: Minhas tarefas
      - link "Equipe" [ref=e31] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m/settings
        - img [ref=e32]
        - text: Equipe
      - link "Minha conta" [ref=e35] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m/account
        - img [ref=e36]
        - text: Minha conta
    - generic [ref=e39]:
      - link "DU Demo User demo@example.com" [ref=e40] [cursor=pointer]:
        - /url: /w/cmqh12x6t0001ynl0k1kivg5m/account
        - generic [ref=e41]: DU
        - generic [ref=e42]:
          - paragraph [ref=e43]: Demo User
          - paragraph [ref=e44]: demo@example.com
      - button "Sair" [ref=e45]:
        - img [ref=e46]
        - text: Sair
  - generic [ref=e49]:
    - banner [ref=e50]:
      - generic [ref=e52]:
        - img [ref=e53]
        - generic [ref=e55]: /
        - generic [ref=e56]: Board
      - generic [ref=e57]:
        - button "Buscar" [ref=e58]:
          - img [ref=e59]
        - button "Notificações" [ref=e63]:
          - img [ref=e64]
    - main [ref=e67]:
      - generic [ref=e68]:
        - paragraph [ref=e69]: Projeto não encontrado
        - link "Voltar aos projetos" [ref=e70] [cursor=pointer]:
          - /url: /w/cmqh12x6t0001ynl0k1kivg5m
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const TASK_TITLE = `E2E Calendar ${Date.now()}`;
  4  | 
  5  | test('calendário: criar tarefa com prazo e visualizar no calendário', async ({ page }) => {
  6  |   await page.goto('/login');
  7  | 
  8  |   await page.getByLabel('Email').fill('demo@example.com');
  9  |   await page.getByLabel('Senha').fill('demo123456');
  10 |   await page.getByRole('button', { name: 'Entrar' }).click();
  11 | 
  12 |   await expect(page).toHaveURL(/\/workspaces/);
  13 |   await page.getByText('Acme Inc').click();
  14 | 
  15 |   await page.getByRole('link', { name: 'Website Redesign' }).click();
  16 |   await expect(page).toHaveURL(/\/projects\/.+/);
  17 | 
> 18 |   await page.getByRole('button', { name: /Nova tarefa/ }).click();
     |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  19 |   await page.getByLabel('Título').fill(TASK_TITLE);
  20 | 
  21 |   const tomorrow = new Date();
  22 |   tomorrow.setDate(tomorrow.getDate() + 1);
  23 |   const dateValue = tomorrow.toISOString().slice(0, 10);
  24 |   await page.locator('input[type="date"]').fill(dateValue);
  25 | 
  26 |   await page.getByRole('button', { name: 'Criar tarefa' }).click();
  27 |   await expect(page.getByText(TASK_TITLE)).toBeVisible();
  28 | 
  29 |   await page.getByTestId('calendar-view-toggle').click();
  30 | 
  31 |   const dateKey = dateValue;
  32 |   const dayCell = page.getByTestId(`calendar-day-${dateKey}`);
  33 |   await expect(dayCell.getByText(TASK_TITLE)).toBeVisible();
  34 | 
  35 |   await dayCell.getByText(TASK_TITLE).click();
  36 |   await expect(page.getByRole('dialog')).toBeVisible();
  37 |   await expect(page.getByRole('dialog').getByLabel('Título')).toHaveValue(TASK_TITLE);
  38 | });
  39 | 
```