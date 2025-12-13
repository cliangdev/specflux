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
const PROJECT_ROUTES_KEY = "specflux_project_routes";
const DEFAULT_ROUTE = "/board";

// Routes that are project-specific and should be remembered
const PROJECT_ROUTES_PATTERN = /^\/(board|prds|epics|tasks|roadmap|settings)/;

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  /** Select a project and get the route to navigate to */
  selectProject: (project: Project) => string;
  refreshProjects: () => Promise<void>;
  /** Get the projectRef for API calls (projectKey or id) */
  getProjectRef: () => string | null;
  /** Save the current route for the current project */
  saveCurrentRoute: (route: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

// Helper to get project routes from localStorage
function getProjectRoutes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(PROJECT_ROUTES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Helper to save project routes to localStorage
function saveProjectRoutes(routes: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECT_ROUTES_KEY, JSON.stringify(routes));
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

  // Save current route for current project
  const saveCurrentRoute = useCallback((route: string) => {
    const project = currentProjectRef.current;
    if (!project?.id) return;

    // Only save project-specific routes
    if (!PROJECT_ROUTES_PATTERN.test(route)) return;

    const routes = getProjectRoutes();
    routes[project.id] = route;
    saveProjectRoutes(routes);
  }, []);

  // Select project and return the route to navigate to
  const selectProject = useCallback((project: Project): string => {
    const previousProject = currentProjectRef.current;

    // Save current route for previous project before switching
    if (previousProject?.id && typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      if (PROJECT_ROUTES_PATTERN.test(currentPath)) {
        const routes = getProjectRoutes();
        routes[previousProject.id] = currentPath;
        saveProjectRoutes(routes);
      }
    }

    setCurrentProject(project);

    // Persist selection to localStorage
    if (project.id) {
      localStorage.setItem(SELECTED_PROJECT_KEY, project.id);
      savedProjectId.current = project.id;
    }

    // Return the saved route for the new project, or default
    const routes = getProjectRoutes();
    return routes[project.id ?? ""] ?? DEFAULT_ROUTE;
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
    saveCurrentRoute,
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
