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
import { v2Api } from "../api/v2/client";
import type { Project as V2Project } from "../api/v2/generated";
import {
  getBackendSettings,
  subscribeToBackendSettings,
} from "../stores/backendStore";

/**
 * Unified project type that works with both v1 and v2 backends.
 * Extends v1 Project with optional v2 fields.
 */
export interface UnifiedProject extends Project {
  /** v2 publicId (when using v2 backend) */
  v2PublicId?: string;
  /** v2 projectKey (when using v2 backend) */
  v2ProjectKey?: string;
  /** Source backend */
  _source?: "v1" | "v2";
}

interface ProjectContextValue {
  projects: UnifiedProject[];
  currentProject: UnifiedProject | null;
  loading: boolean;
  error: string | null;
  selectProject: (project: UnifiedProject) => void;
  refreshProjects: () => Promise<void>;
  /** Whether v2 backend is currently being used */
  usingV2: boolean;
  /** Get the projectRef for v2 API calls (projectKey or publicId) */
  getProjectRef: () => string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

/**
 * Convert v2 Project to UnifiedProject.
 */
function v2ToUnifiedProject(v2Project: V2Project): UnifiedProject {
  return {
    // Generate a fake v1 id (not used when v2 is enabled)
    id: 0,
    name: v2Project.name,
    projectId: v2Project.projectKey,
    localPath: "",
    workflowTemplate: "startup-fast",
    ownerUserId: 0,
    createdAt: v2Project.createdAt,
    updatedAt: v2Project.updatedAt,
    // v2 specific fields
    v2PublicId: v2Project.publicId,
    v2ProjectKey: v2Project.projectKey,
    _source: "v2",
  };
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [currentProject, setCurrentProject] = useState<UnifiedProject | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingV2, setUsingV2] = useState(false);

  // Use ref to access currentProject without adding to dependency array
  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  // Listen to backend settings changes
  useEffect(() => {
    const settings = getBackendSettings();
    setUsingV2(settings.v2Enabled && settings.migrationComplete);

    const unsubscribe = subscribeToBackendSettings((newSettings) => {
      setUsingV2(newSettings.v2Enabled && newSettings.migrationComplete);
    });

    return unsubscribe;
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let projectList: UnifiedProject[];

      if (usingV2) {
        // Fetch from v2 (Spring Boot) backend
        console.log("[ProjectContext] Fetching projects from v2 API");
        const response = await v2Api.projects.listProjects({});
        projectList = (response.data ?? []).map(v2ToUnifiedProject);
      } else {
        // Fetch from v1 (Node.js) backend
        console.log("[ProjectContext] Fetching projects from v1 API");
        const response = await api.projects.listProjects();
        projectList = (response.data ?? []).map((p) => ({
          ...p,
          _source: "v1" as const,
        }));
      }

      setProjects(projectList);

      // Use ref to get current value without dependency
      const currentProj = currentProjectRef.current;

      // Auto-select first project if none selected
      if (!currentProj && projectList.length > 0) {
        setCurrentProject(projectList[0]);
      } else if (currentProj) {
        // Re-find current project in new list (may have different id if backend changed)
        const found = projectList.find((p) => p.name === currentProj.name);
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
  }, [usingV2]); // Removed currentProject from dependencies to prevent infinite loop

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectProject = useCallback((project: UnifiedProject) => {
    setCurrentProject(project);
  }, []);

  const getProjectRef = useCallback((): string | null => {
    if (!currentProject) return null;
    // For v2, use projectKey or publicId
    return currentProject.v2ProjectKey ?? currentProject.v2PublicId ?? null;
  }, [currentProject]);

  const value: ProjectContextValue = {
    projects,
    currentProject,
    loading,
    error,
    selectProject,
    refreshProjects: fetchProjects,
    usingV2,
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
