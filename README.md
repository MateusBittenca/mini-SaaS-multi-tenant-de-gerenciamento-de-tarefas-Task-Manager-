# Task Manager — Mini-SaaS Multi-Tenant

Um sistema de gerenciamento de tarefas multi-tenant construído como projeto de portfólio, demonstrando autenticação segura com JWT, isolamento de dados por workspace e arquitetura escalável.

## Funcionalidades

### Core
- **Autenticação segura**: registro, login, refresh token (httpOnly cookie), logout e edição de perfil/senha
- **Multi-tenancy**: workspaces isolados com membros e roles (OWNER, ADMIN, MEMBER)
- **Projetos e tarefas**: CRUD completo com prioridade, responsável, prazo e isolamento por workspace
- **Kanban board**: drag-and-drop entre colunas (A Fazer / Em Progresso / Concluído)
- **Autorização por role**: permissões granulares por ação

### Colaboração
- **Comentários** em tarefas com histórico
- **Atividade** (audit log) por tarefa
- **Convites** de membros por e-mail com link de aceite/recusa
- **E-mail transacional** nos convites via Resend (com fallback de copiar link)
- **Notificações in-app**: convites, atribuição de tarefa, comentários e prazos próximos
- **Gestão de equipe**: convites pendentes, alteração de roles, remoção de membros, transferência de ownership

### Produtividade
- **Visão geral** do workspace com métricas e tarefas com prazo próximo
- **Minhas tarefas** agrupadas por status e atrasadas
- **Filtros no board** por texto, responsável, prioridade e status
- **Busca global** no workspace (`Cmd/Ctrl+K`) em tarefas e projetos
- **Atalhos de teclado**: `N` (nova tarefa), `/` (busca no projeto)
- **Dark mode** na conta do usuário

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, @dnd-kit, react-hook-form |
| Backend | Node.js, Express 5, TypeScript, Prisma, Zod |
| Banco | PostgreSQL |
| Auth | JWT (access + refresh token) |
| E-mail | Resend (opcional em dev) |
| Testes | Vitest + Supertest (backend), Playwright (E2E) |
| Infra | Docker, Docker Compose, Nginx |

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│   Nginx     │────▶│   Express    │
│  (React)    │     │  (Frontend) │     │  (Backend)   │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │  PostgreSQL  │
                                        └──────────────┘
```

### Fluxo Multi-Tenant

1. Usuário autentica e recebe access token (15min) + refresh token (cookie httpOnly, 7 dias)
2. Usuário seleciona um workspace ativo
3. Todas as requisições incluem header `X-Workspace-Id`
4. Middleware valida membership e role antes de cada operação
5. Dados (projetos, tarefas) são filtrados por `workspace_id`

## Variáveis de ambiente

### Raiz (`.env.example` — Docker)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_*` | Credenciais e porta do PostgreSQL |
| `JWT_SECRET` | Chave do access token |
| `JWT_REFRESH_SECRET` | Chave do refresh token |
| `FRONTEND_URL` | URL do frontend (CORS e links de convite) |
| `RESEND_API_KEY` | API key do Resend (opcional em dev) |
| `EMAIL_FROM` | Remetente dos e-mails de convite |

### Backend (`backend/.env`)

Mesmas variáveis de JWT, `DATABASE_URL`, `FRONTEND_URL`, `RESEND_API_KEY` e `EMAIL_FROM`.

Sem `RESEND_API_KEY`, o link do convite é logado no console do backend.

## Como rodar com Docker

```bash
cd Saas
cp .env.example .env
# Edite .env: JWT_SECRET, JWT_REFRESH_SECRET e opcionalmente RESEND_API_KEY

docker compose up --build

# Frontend: http://localhost
# API: http://localhost/api
```

O backend executa migrations e seed na inicialização.

## Como rodar em desenvolvimento

### Pré-requisitos

- Node.js 20+
- Docker (PostgreSQL) ou PostgreSQL local

### Banco via Docker

```bash
docker compose up postgres -d
# Postgres em localhost:5433
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
# API em http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App em http://localhost:5173 (proxy /api → backend)
```

## Testes

### Backend (Vitest + Supertest)

Requer PostgreSQL rodando e `backend/.env` configurado.

```bash
cd backend
npm test
```

Cobre: auth, isolamento de workspace, CRUD, roles, convites, notificações, comentários e busca global.

### E2E (Playwright)

Requer backend (`:3000`) e frontend (`:5173`) rodando, com banco seedado.

```bash
cd frontend
npx playwright install chromium   # primeira vez
npm run test:e2e
```

Fluxo testado: login → workspace Acme → projeto → criar tarefa → mover status no Kanban.

## Credenciais de teste

| Campo | Valor |
|-------|-------|
| Email | `demo@example.com` |
| Senha | `demo123456` |

O seed cria o workspace **Acme Inc** com 3 projetos e 15 tarefas.

## Como testar manualmente as novas features

### 1. E-mail nos convites
1. Configure `RESEND_API_KEY` e `EMAIL_FROM` no `backend/.env`
2. Como OWNER/ADMIN, vá em **Equipe** → convide um e-mail
3. Verifique o inbox (ou o log do console sem API key)
4. O link copiável continua disponível na tela

### 2. Notificações
1. Atribua uma tarefa a outro membro → ele vê notificação no sino
2. Comente em tarefa de outro → assignee recebe notificação
3. Crie tarefa com prazo em 24h → job horário gera `TASK_DUE_SOON`
4. Clique na notificação para ir à tarefa; use **Marcar todas como lidas**

### 3. Busca global
1. Dentro de um workspace, pressione `Cmd+K` (Mac) ou `Ctrl+K`
2. Digite 2+ caracteres para buscar tarefas e projetos
3. Clique no resultado para navegar

### 4. Testes automatizados
```bash
cd backend && npm test
cd frontend && npm run test:e2e
```

## Estrutura do Projeto

```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── jobs/            # Job de prazos (due soon)
│   │   ├── tests/           # Testes de integração
│   │   ├── prisma/
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   ├── e2e/                 # Testes Playwright
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Renovar access token
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Perfil atual
- `PATCH /api/auth/me` — Atualizar perfil/senha

### Notificações
- `GET /api/notifications` — Convites + notificações in-app
- `PATCH /api/notifications/:id/read` — Marcar como lida
- `POST /api/notifications/read-all` — Marcar todas como lidas
- `POST /api/invites/:id/accept` — Aceitar convite
- `POST /api/invites/:id/decline` — Recusar convite

### Workspaces
- `GET /api/workspaces` — Listar workspaces do usuário
- `POST /api/workspaces` — Criar workspace
- `PATCH /api/workspaces/:id` — Renomear workspace (OWNER)
- `GET /api/workspaces/:id/overview` — Métricas do workspace
- `GET /api/workspaces/:id/search?q=` — Busca global (mín. 2 chars)
- `GET /api/workspaces/:id/tasks/mine` — Tarefas atribuídas ao usuário
- `POST /api/workspaces/:id/invite` — Convidar membro (OWNER/ADMIN)
- `GET /api/workspaces/:id/members` — Listar membros
- `PATCH /api/workspaces/:id/members/:memberId` — Alterar role (OWNER)
- `DELETE /api/workspaces/:id/members/:memberId` — Remover membro
- `POST /api/workspaces/:id/transfer-ownership` — Transferir ownership
- `GET /api/workspaces/invites/:token` — Preview do convite
- `POST /api/workspaces/invites/:token/accept` — Aceitar via link

### Projects
- `GET /api/workspaces/:workspaceId/projects` — Listar projetos
- `POST /api/workspaces/:workspaceId/projects` — Criar projeto
- `GET /api/workspaces/:workspaceId/projects/:projectId` — Detalhe
- `PATCH /api/projects/:id` — Atualizar projeto (ADMIN+)
- `DELETE /api/projects/:id` — Deletar projeto (ADMIN+)

### Tasks
- `GET /api/projects/:projectId/tasks` — Listar tarefas
- `POST /api/projects/:projectId/tasks` — Criar tarefa
- `GET /api/tasks/:id` — Detalhe da tarefa
- `PATCH /api/tasks/:id` — Atualizar tarefa
- `DELETE /api/tasks/:id` — Deletar tarefa (ADMIN+)
- `GET /api/tasks/:id/comments` — Listar comentários
- `POST /api/tasks/:id/comments` — Criar comentário
- `DELETE /api/tasks/:id/comments/:commentId` — Deletar comentário
- `GET /api/tasks/:id/activity` — Histórico de atividade

## Licença

MIT
