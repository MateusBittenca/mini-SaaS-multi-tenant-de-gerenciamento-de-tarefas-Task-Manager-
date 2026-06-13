# Task Manager — Mini-SaaS Multi-Tenant

Um sistema de gerenciamento de tarefas multi-tenant construído como projeto de portfólio, demonstrando autenticação segura com JWT, isolamento de dados por workspace e arquitetura escalável.

## Funcionalidades

- **Autenticação segura**: registro, login, refresh token (httpOnly cookie) e logout
- **Multi-tenancy**: workspaces isolados com membros e roles (OWNER, ADMIN, MEMBER)
- **Projetos e tarefas**: CRUD completo com isolamento por workspace
- **Kanban board**: drag-and-drop entre colunas (A Fazer / Em Progresso / Concluído)
- **Convites**: convite de membros por email com link de aceite
- **Autorização por role**: permissões granulares por ação

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Zustand, @dnd-kit |
| Backend | Node.js, Express, TypeScript, Prisma, Zod |
| Banco | PostgreSQL |
| Auth | JWT (access + refresh token) |
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

## Como rodar com Docker

```bash
# 1. Clone e entre no diretório
cd Saas

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e altere JWT_SECRET e JWT_REFRESH_SECRET

# 3. Suba todos os serviços
docker compose up --build

# 4. Acesse
# Frontend: http://localhost
# API: http://localhost/api
```

O backend executa automaticamente as migrations e o seed na inicialização.

## Como rodar em desenvolvimento (sem Docker completo)

### Pré-requisitos

- Node.js 20+
- Docker (apenas para o PostgreSQL) **ou** PostgreSQL instalado localmente

### Opção A — PostgreSQL via Docker (recomendado)

```bash
# Na raiz do projeto: sobe só o banco
docker compose up postgres -d

# O Postgres fica em localhost:5433 (porta 5432 costuma estar ocupada no macOS)
```

### Backend

```bash
cd backend
cp .env.example .env
# DATABASE_URL já aponta para localhost:5433

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

### Opção B — PostgreSQL local

Se você já tem PostgreSQL na porta 5432, ajuste `DATABASE_URL` no `backend/.env` com suas credenciais:

```
DATABASE_URL=postgresql://SEU_USER:SUA_SENHA@localhost:5432/taskmanager
```

Crie o banco `taskmanager` antes de rodar as migrations.

## Credenciais de teste

| Campo | Valor |
|-------|-------|
| Email | `demo@example.com` |
| Senha | `demo123456` |

O seed cria o workspace **Acme Inc** com 3 projetos e 15 tarefas distribuídas entre os status.

## Screenshots

<!-- Adicione screenshots aqui -->
| Login | Dashboard | Kanban |
|-------|-----------|--------|
| _screenshot-login.png_ | _screenshot-dashboard.png_ | _screenshot-kanban.png_ |

## Estrutura do Projeto

```
/
├── backend/
│   ├── src/
│   │   ├── routes/          # Rotas REST
│   │   ├── controllers/     # Handlers HTTP
│   │   ├── middlewares/     # Auth, workspace, rate limit
│   │   ├── services/        # Lógica de negócio
│   │   ├── schemas/         # Validação Zod
│   │   ├── lib/             # Utilitários
│   │   ├── prisma/          # Schema + seed + migrations
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Telas da aplicação
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── stores/          # Zustand (auth + workspace)
│   │   └── lib/             # API client + types
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Renovar access token
- `POST /api/auth/logout` — Logout

### Workspaces
- `GET /api/workspaces` — Listar workspaces do usuário
- `POST /api/workspaces` — Criar workspace
- `POST /api/workspaces/:id/invite` — Convidar membro (OWNER/ADMIN)
- `POST /api/workspaces/invites/:token/accept` — Aceitar convite
- `GET /api/workspaces/:id/members` — Listar membros

### Projects
- `GET /api/workspaces/:workspaceId/projects` — Listar projetos
- `POST /api/workspaces/:workspaceId/projects` — Criar projeto
- `DELETE /api/projects/:id` — Deletar projeto (ADMIN+)

### Tasks
- `GET /api/projects/:projectId/tasks` — Listar tarefas
- `POST /api/projects/:projectId/tasks` — Criar tarefa
- `PATCH /api/tasks/:id` — Atualizar tarefa
- `DELETE /api/tasks/:id` — Deletar tarefa (ADMIN+)

## Licença

MIT
