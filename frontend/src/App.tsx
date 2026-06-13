import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { SettingsPage } from './pages/SettingsPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { OverviewPage } from './pages/OverviewPage';
import { AccountPage } from './pages/AccountPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { useAuthStore } from './stores/authStore';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/invites/:token" element={<AcceptInvitePage />} />
          <Route path="/w/:workspaceId" element={<WorkspaceLayout />}>
            <Route path="overview" element={<OverviewPage />} />
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<MyTasksPage />} />
            <Route path="projects/:projectId" element={<ProjectPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
