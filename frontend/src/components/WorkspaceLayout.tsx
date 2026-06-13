import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import api from '../lib/api';
import { NotificationBell } from './NotificationBell';

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const clearWorkspace = useWorkspaceStore((s) => s.clear);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const workspace = getActiveWorkspace();

  if (workspaceId && workspace?.id !== workspaceId) {
    setActiveWorkspace(workspaceId);
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    logout();
    clearWorkspace();
    navigate('/login');
  };

  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const navItems = [
    {
      to: `/w/${workspaceId}/overview`,
      label: 'Visão geral',
      icon: BarChart3,
      active: location.pathname.includes('/overview'),
    },
    {
      to: `/w/${workspaceId}`,
      label: 'Projetos',
      icon: LayoutGrid,
      active: location.pathname === `/w/${workspaceId}`,
    },
    {
      to: `/w/${workspaceId}/tasks`,
      label: 'Minhas tarefas',
      icon: ListTodo,
      active: location.pathname.includes('/tasks'),
    },
    ...(canManage
      ? [
          {
            to: `/w/${workspaceId}/settings`,
            label: 'Equipe',
            icon: Settings,
            active: location.pathname.includes('/settings'),
          },
        ]
      : []),
    {
      to: `/w/${workspaceId}/account`,
      label: 'Minha conta',
      icon: User,
      active: location.pathname.includes('/account'),
    },
  ];

  const roleLabel =
    workspace?.role === 'OWNER'
      ? 'Proprietário'
      : workspace?.role === 'ADMIN'
        ? 'Administrador'
        : 'Membro';

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const breadcrumb =
    location.pathname.includes('/overview')
      ? 'Visão geral'
      : location.pathname.includes('/projects/')
        ? 'Board'
        : location.pathname.includes('/tasks')
          ? 'Minhas tarefas'
          : location.pathname.includes('/settings')
            ? 'Equipe'
            : location.pathname.includes('/account')
              ? 'Minha conta'
              : 'Projetos';

  return (
    <div className="min-h-screen flex bg-cream">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-sidebar/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar text-white flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center justify-between">
            <Link to="/workspaces" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                  <path d="M5 8h14M5 12h10M5 16h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="18" cy="12" r="1.5" fill="#5A7A6A" />
                </svg>
              </div>
              <span className="font-display font-semibold text-lg tracking-tight group-hover:text-terracotta-light transition-colors">
                Trama
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {workspace && (
          <div className="px-4 py-4 border-b border-white/8">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Workspace</p>
            <p className="font-display font-semibold text-white truncate">{workspace.name}</p>
            <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-terracotta/20 text-terracotta-light">
              {roleLabel}
            </span>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, active }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-terracotta text-white'
                  : 'text-white/55 hover:text-white hover:bg-sidebar-hover'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/8">
          <Link
            to={`/w/${workspaceId}/account`}
            className="flex items-center gap-3 mb-3 rounded-xl px-2 py-1.5 hover:bg-sidebar-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-sidebar-hover transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-sand px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-cream-dark text-espresso-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-espresso-muted text-sm min-w-0">
              <FolderKanban className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-espresso-faint">/</span>
              <span className="font-medium text-espresso truncate">{breadcrumb}</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
