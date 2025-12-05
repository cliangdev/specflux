import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { api, type Project } from "../api";
import { useAuth } from "./AuthContext";

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  selectProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  /** Get the projectRef for API calls (projectKey or id) */
  getProjectRef: () => string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { isSignedIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to access currentProject without adding to dependency array
  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[ProjectContext] Fetching projects from v2 API");
      const response = await api.projects.listProjects({});
      const projectList = response.data ?? [];

      setProjects(projectList);

      // Use ref to get current value without dependency
      const currentProj = currentProjectRef.current;

      // Auto-select first project if none selected
      if (!currentProj && projectList.length > 0) {
        setCurrentProject(projectList[0]);
      } else if (currentProj) {
        // Re-find current project in new list
        const found = projectList.find((p) => p.id === currentProj.id);
        if (found) {
          setCurrentProject(found);
        } else if (projectList.length > 0) {
          setCurrentProject(projectList[0]);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch projects when signed in, refetch if auth state changes
  useEffect(() => {
    if (isSignedIn) {
      fetchProjects();
    }
  }, [isSignedIn, fetchProjects]);

  const selectProject = useCallback((project: Project) => {
    setCurrentProject(project);
  }, []);

  const getProjectRef = useCallback((): string | null => {
    if (!currentProject) return null;
    // Use projectKey or id for API calls
    return currentProject.projectKey ?? currentProject.id ?? null;
  }, [currentProject]);

  const value: ProjectContextValue = {
    projects,
    currentProject,
    loading,
    error,
    selectProject,
    refreshProjects: fetchProjects,
    getProjectRef,
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
