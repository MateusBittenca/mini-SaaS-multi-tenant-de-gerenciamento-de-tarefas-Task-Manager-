import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarClock,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { AppNotification } from '../lib/types';
import { Button } from './Button';

const roleLabels = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

function notificationText(n: AppNotification): string {
  const title = (n.metadata.taskTitle as string) ?? 'uma tarefa';
  switch (n.type) {
    case 'TASK_ASSIGNED':
      return `${n.actorName ?? 'Alguém'} atribuiu você em "${title}"`;
    case 'TASK_COMMENTED':
      return `${n.actorName ?? 'Alguém'} comentou em "${title}"`;
    case 'TASK_DUE_SOON':
      return `"${title}" vence em breve`;
    default:
      return 'Nova notificação';
  }
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return <UserPlus className="w-4 h-4 text-terracotta" />;
    case 'TASK_COMMENTED':
      return <MessageSquare className="w-4 h-4 text-sage" />;
    case 'TASK_DUE_SOON':
      return <CalendarClock className="w-4 h-4 text-amber-warm" />;
    default:
      return <Bell className="w-4 h-4 text-espresso-muted" />;
  }
}

interface NotificationBellProps {
  variant?: 'light' | 'dark';
}

export function NotificationBell({ variant = 'light' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'invites'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const {
    invites,
    notifications,
    unreadCount,
    loading,
    actionLoading,
    error,
    acceptInvite,
    declineInvite,
    markAsRead,
    markAllAsRead,
    formatRelativeTime,
  } = useNotifications();

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleAccept = async (inviteId: string) => {
    const result = await acceptInvite(inviteId);
    if (result) {
      setOpen(false);
      setActiveWorkspace(result.workspaceId);
      navigate(`/w/${result.workspaceId}`);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) await markAsRead(n.id);
    setOpen(false);
    if (n.workspaceId) setActiveWorkspace(n.workspaceId);
    if (n.projectId && n.taskId) {
      navigate(`/w/${n.workspaceId}/projects/${n.projectId}`, {
        state: { openTaskId: n.taskId },
      });
    } else if (n.projectId) {
      navigate(`/w/${n.workspaceId}/projects/${n.projectId}`);
    }
  };

  const isDark = variant === 'dark';
  const showInvites = tab === 'invites' || tab === 'all';
  const showActivity = tab === 'all';
  const isEmpty =
    !loading &&
    (tab === 'invites' ? invites.length === 0 : invites.length === 0 && notifications.length === 0);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        aria-expanded={open}
        className={`relative p-2 rounded-lg transition-colors ${
          isDark
            ? 'text-white/60 hover:text-white hover:bg-white/8'
            : 'text-espresso-muted hover:text-espresso hover:bg-cream-dark'
        }`}
      >
        <Bell className="w-5 h-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-terracotta text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-sand rounded-2xl z-50 animate-fade-in overflow-hidden"
          style={{ boxShadow: 'var(--shadow-modal)' }}
        >
          <div className="px-4 py-3 border-b border-sand">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-espresso text-sm">Notificações</h3>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-terracotta hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-xs text-espresso-faint mt-0.5">
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  tab === 'all' ? 'bg-terracotta-light text-terracotta' : 'text-espresso-muted hover:bg-cream-dark'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setTab('invites')}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  tab === 'invites' ? 'bg-terracotta-light text-terracotta' : 'text-espresso-muted hover:bg-cream-dark'
                }`}
              >
                Convites {invites.length > 0 && `(${invites.length})`}
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && invites.length === 0 && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
              </div>
            ) : isEmpty ? (
              <div className="py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-espresso-faint mx-auto mb-2 opacity-40" />
                <p className="text-sm text-espresso-muted">Nenhuma notificação</p>
              </div>
            ) : (
              <ul className="divide-y divide-sand">
                {showInvites &&
                  invites.map((invite) => (
                    <li key={`invite-${invite.id}`} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-terracotta-light flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-terracotta" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-espresso leading-snug">
                            Convite para{' '}
                            <strong className="font-medium">{invite.workspaceName}</strong>
                          </p>
                          <p className="text-xs text-espresso-faint mt-0.5">
                            como {roleLabels[invite.role]} · {formatRelativeTime(invite.createdAt)}
                          </p>
                          {invite.invitedBy && (
                            <p className="text-xs text-espresso-muted mt-0.5">
                              por {invite.invitedBy.name}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              loading={actionLoading === invite.id}
                              onClick={() => handleAccept(invite.id)}
                            >
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === invite.id}
                              onClick={() => declineInvite(invite.id)}
                            >
                              Recusar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}

                {showActivity &&
                  notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full p-4 text-left hover:bg-cream-dark transition-colors ${
                          !n.read ? 'bg-terracotta/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cream-dark flex items-center justify-center shrink-0">
                            <NotificationIcon type={n.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-espresso leading-snug">
                              {notificationText(n)}
                            </p>
                            <p className="text-xs text-espresso-faint mt-0.5">
                              {n.workspaceName && `${n.workspaceName} · `}
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-terracotta shrink-0 mt-1.5" />
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 border-t border-sand bg-danger-light">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
