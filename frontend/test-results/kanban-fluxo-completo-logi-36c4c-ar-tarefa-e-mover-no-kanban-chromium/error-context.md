# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kanban.spec.ts >> fluxo completo: login, workspace, projeto, criar tarefa e mover no kanban
- Location: e2e/kanban.spec.ts:5:1

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
  3  | const TASK_TITLE = `E2E Task ${Date.now()}`;
  4  | 
  5  | test('fluxo completo: login, workspace, projeto, criar tarefa e mover no kanban', async ({
  6  |   page,
  7  | }) => {
  8  |   await page.goto('/login');
  9  | 
  10 |   await page.getByLabel('Email').fill('demo@example.com');
  11 |   await page.getByLabel('Senha').fill('demo123456');
  12 |   await page.getByRole('button', { name: 'Entrar' }).click();
  13 | 
  14 |   await expect(page).toHaveURL(/\/workspaces/);
  15 |   await page.getByText('Acme Inc').click();
  16 | 
  17 |   await expect(page).toHaveURL(/\/w\/.+/);
  18 |   await page.getByRole('link', { name: 'Website Redesign' }).click();
  19 | 
  20 |   await expect(page).toHaveURL(/\/projects\/.+/);
> 21 |   await page.getByRole('button', { name: /Nova tarefa/ }).click();
     |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  22 | 
  23 |   await page.getByLabel('Título').fill(TASK_TITLE);
  24 |   await page.getByRole('button', { name: 'Criar tarefa' }).click();
  25 | 
  26 |   const todoColumn = page.getByTestId('kanban-column-TODO');
  27 |   const progressColumn = page.getByTestId('kanban-column-IN_PROGRESS');
  28 | 
  29 |   await expect(todoColumn.getByText(TASK_TITLE)).toBeVisible();
  30 | 
  31 |   await todoColumn.getByText(TASK_TITLE).click();
  32 |   const dialog = page.getByRole('dialog');
  33 |   await expect(dialog).toBeVisible();
  34 | 
  35 |   await dialog.locator('select').first().selectOption('IN_PROGRESS');
  36 | 
  37 |   const saveResponse = page.waitForResponse(
  38 |     (res) => res.request().method() === 'PATCH' && res.url().includes('/tasks/')
  39 |   );
  40 |   await dialog.getByRole('button', { name: 'Salvar' }).click();
  41 |   await saveResponse;
  42 |   await expect(dialog).not.toBeVisible();
  43 | 
  44 |   await expect(progressColumn.getByText(TASK_TITLE)).toBeVisible();
  45 |   await expect(todoColumn.getByText(TASK_TITLE)).not.toBeVisible();
  46 | });
  47 | 
```