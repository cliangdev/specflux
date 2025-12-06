import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { MainLayout } from "./components/layout";
import { ProjectProvider, ThemeProvider } from "./contexts";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  BoardPage,
  TasksPage,
  TaskDetailPage,
  EpicsPage,
  EpicDetailPage,
  RoadmapPage,
  FilesPage,
  SettingsPage,
  AgentDetailPage,
  PRDsPage,
  PRDDetailPage,
} from "./pages";
import LoginPage from "./pages/LoginPage";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-system-50 dark:bg-system-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm text-system-500 dark:text-system-400">
          Loading...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ProjectProvider>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Navigate to="/board" replace />} />
                  <Route path="prds" element={<PRDsPage />} />
                  <Route path="prds/:prdName" element={<PRDDetailPage />} />
                  <Route path="board" element={<BoardPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="tasks/:taskId" element={<TaskDetailPage />} />
                  <Route path="roadmap" element={<RoadmapPage />} />
                  <Route path="epics" element={<EpicsPage />} />
                  <Route path="epics/:id" element={<EpicDetailPage />} />
                  <Route path="files" element={<FilesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route
                    path="settings/agents/:id"
                    element={<AgentDetailPage />}
                  />
                </Route>
              </Routes>
            </ProjectProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
