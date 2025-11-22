import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type Project } from "../api";

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  selectProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.projects.listProjects();
      const projectList = response.data ?? [];
      setProjects(projectList);

      // Auto-select first project if none selected
      if (!currentProject && projectList.length > 0) {
        setCurrentProject(projectList[0]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectProject = useCallback((project: Project) => {
    setCurrentProject(project);
  }, []);

  const value: ProjectContextValue = {
    projects,
    currentProject,
    loading,
    error,
    selectProject,
    refreshProjects: fetchProjects,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
