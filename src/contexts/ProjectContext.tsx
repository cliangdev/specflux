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

const SELECTED_PROJECT_KEY = "specflux_selected_project_id";

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

  // Load saved project ID from localStorage
  const savedProjectId = useRef<string | null>(
    typeof window !== "undefined"
      ? localStorage.getItem(SELECTED_PROJECT_KEY)
      : null
  );

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

      // Auto-select project: saved > current > first
      if (!currentProj && projectList.length > 0) {
        // Try to restore saved project from localStorage
        if (savedProjectId.current) {
          const savedProject = projectList.find(
            (p) => p.id === savedProjectId.current
          );
          if (savedProject) {
            setCurrentProject(savedProject);
          } else {
            // Saved project not found, select first and clear saved
            setCurrentProject(projectList[0]);
            localStorage.removeItem(SELECTED_PROJECT_KEY);
            savedProjectId.current = null;
          }
        } else {
          setCurrentProject(projectList[0]);
        }
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
    // Persist selection to localStorage
    if (project.id) {
      localStorage.setItem(SELECTED_PROJECT_KEY, project.id);
      savedProjectId.current = project.id;
    }
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
