import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface TaskInfo {
  id: string;
  title: string;
}

export type ContextType = "task" | "epic" | "project" | "prd" | "prd-workshop" | "release";

// Page context types for suggested commands
export type PageContextType =
  | "prds"
  | "prd-detail"
  | "epics"
  | "epic-detail"
  | "tasks"
  | "task-detail"
  | "releases"
  | "release-detail"
  | "board"
  | "files"
  | "settings"
  | "agents"
  | "agent-detail"
  | "roadmap"
  | "home";

export interface PageContext {
  type: PageContextType;
  id?: string; // Optional ID for detail pages
  title?: string; // Optional title for display
}

export interface SuggestedCommand {
  label: string;
  command: string;
  description?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
}

export interface ContextInfo {
  type: ContextType;
  id: string;
  title: string;
  displayKey?: string; // Human-readable key like "SPEC-T1" for display in tabs
  projectRef?: string; // Project reference for API calls
  agent?: AgentInfo;
  workingDirectory?: string; // Working directory for the terminal
  initialCommand?: string; // Command to run after terminal starts (e.g., "claude")
}

export interface TerminalSession {
  id: string; // e.g., "task-123", "epic-5", "project-2"
  contextType: ContextType;
  contextId: string;
  contextTitle: string;
  displayKey?: string; // Human-readable key like "SPEC-T1" for display in tabs
  projectRef?: string; // Project reference for API calls
  agent?: AgentInfo; // Agent assigned to this session (for task contexts)
  workingDirectory?: string; // Working directory for the terminal
  initialCommand?: string; // Command to run after terminal starts
  isRunning: boolean;
  isConnected: boolean;
}

interface TerminalContextValue {
  // Panel state
  isOpen: boolean;
  isCollapsed: boolean;
  panelHeight: number;
  isMaximized: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleCollapse: () => void;
  setPanelHeight: (height: number) => void;
  toggleMaximize: () => void;

  // Multi-tab session state
  sessions: TerminalSession[];
  activeSessionId: string | null;
  getExistingSession: (context: ContextInfo) => TerminalSession | null;
  openTerminalForContext: (context: ContextInfo) => void;
  closeSession: (sessionId: string) => void;
  switchToSession: (sessionId: string) => void;
  updateSessionStatus: (
    sessionId: string,
    status: { isRunning?: boolean; isConnected?: boolean },
  ) => void;

  // Page context for suggested commands (does NOT affect active terminal session)
  pageContext: PageContext | null;
  setPageContext: (context: PageContext | null) => void;
  suggestedCommands: SuggestedCommand[];

  // Active session info
  activeSession: TerminalSession | null;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

const STORAGE_KEY = "specflux-terminal-panel";

// Get suggested commands based on current page context
function getSuggestedCommands(pageContext: PageContext | null): SuggestedCommand[] {
  if (!pageContext) return [];

  switch (pageContext.type) {
    case "prds":
      return [
        { label: "/prd new", command: "/prd", description: "Create a new PRD" },
      ];
    case "prd-detail":
      return [
        { label: "/prd refine", command: "/prd refine", description: "Refine this PRD" },
        { label: "/epic", command: "/epic", description: "Create epic from PRD" },
      ];
    case "epics":
      return [
        { label: "/epic", command: "/epic", description: "Define a new epic" },
      ];
    case "epic-detail":
      return [
        { label: `/implement`, command: `/implement ${pageContext.title || ""}`.trim(), description: "Implement this epic" },
        { label: "/design", command: `/design ${pageContext.title || ""}`.trim(), description: "Create design doc" },
        { label: "/task", command: "/task", description: "Start a task" },
      ];
    case "tasks":
      return [
        { label: "/task", command: "/task", description: "Work on a task" },
      ];
    case "task-detail":
      return [
        { label: `/task ${pageContext.id || ""}`, command: `/task ${pageContext.id || ""}`, description: "Start this task" },
      ];
    case "releases":
      return [
        { label: "/epic", command: "/epic", description: "Create a new epic" },
      ];
    case "release-detail":
      return [
        { label: "/implement", command: "/implement", description: "Implement the release" },
        { label: "/epic", command: "/epic", description: "Create epic for release" },
      ];
    case "agents":
    case "agent-detail":
      return [
        { label: "claude", command: "claude", description: "Start Claude Code" },
      ];
    default:
      return [];
  }
}

// Panel height constants
const DEFAULT_PANEL_HEIGHT = 320;
const MIN_PANEL_HEIGHT = 100;
const MAX_PANEL_HEIGHT_PERCENT = 0.8;

interface StoredSession {
  id: string;
  contextType: ContextType;
  contextId: string;
  contextTitle: string;
  displayKey?: string;
  projectRef?: string;
  agent?: AgentInfo;
  workingDirectory?: string;
  initialCommand?: string;
}

interface StoredState {
  isOpen: boolean;
  isCollapsed: boolean;
  panelHeight: number;
  isMaximized: boolean;
  sessions: StoredSession[];
  activeSessionId: string | null;
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  // Helper to get stored state
  const getStoredState = (): Partial<StoredState> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  };

  // Initialize from localStorage
  const [isOpen, setIsOpen] = useState(() => {
    return getStoredState().isOpen ?? false;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return getStoredState().isCollapsed ?? false;
  });

  const [panelHeight, setPanelHeightState] = useState(() => {
    return getStoredState().panelHeight ?? DEFAULT_PANEL_HEIGHT;
  });

  const [isMaximized, setIsMaximized] = useState(() => {
    return getStoredState().isMaximized ?? false;
  });

  // Track pre-maximize height for restore
  const [preMaximizeHeight, setPreMaximizeHeight] =
    useState(DEFAULT_PANEL_HEIGHT);

  // Page context for suggested commands (does NOT affect active terminal session)
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  // Multi-tab session state - restore from localStorage
  const [sessions, setSessions] = useState<TerminalSession[]>(() => {
    const stored = getStoredState();
    if (stored.sessions && Array.isArray(stored.sessions)) {
      return stored.sessions.map((s) => ({
        id: s.id,
        contextType: s.contextType,
        contextId: s.contextId,
        contextTitle: s.contextTitle,
        displayKey: s.displayKey,
        projectRef: s.projectRef,
        agent: s.agent,
        workingDirectory: s.workingDirectory,
        initialCommand: s.initialCommand,
        isRunning: false,
        isConnected: false,
      }));
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return getStoredState().activeSessionId ?? null;
  });

  // Persist panel state to localStorage
  useEffect(() => {
    const storedSessions: StoredSession[] = sessions.map((s) => ({
      id: s.id,
      contextType: s.contextType,
      contextId: s.contextId,
      contextTitle: s.contextTitle,
      displayKey: s.displayKey,
      projectRef: s.projectRef,
      agent: s.agent,
      workingDirectory: s.workingDirectory,
      initialCommand: s.initialCommand,
    }));

    const state: StoredState = {
      isOpen,
      isCollapsed,
      panelHeight,
      isMaximized,
      sessions: storedSessions,
      activeSessionId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    isOpen,
    isCollapsed,
    panelHeight,
    isMaximized,
    sessions,
    activeSessionId,
  ]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setPanelHeight = useCallback(
    (height: number) => {
      const maxHeight =
        typeof window !== "undefined"
          ? window.innerHeight * MAX_PANEL_HEIGHT_PERCENT
          : 600;
      const clampedHeight = Math.min(
        Math.max(height, MIN_PANEL_HEIGHT),
        maxHeight,
      );
      setPanelHeightState(clampedHeight);
      if (isMaximized) {
        setIsMaximized(false);
      }
    },
    [isMaximized],
  );

  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore to previous height
      setPanelHeightState(preMaximizeHeight);
      setIsMaximized(false);
    } else {
      // Save current height and maximize
      setPreMaximizeHeight(panelHeight);
      const maxHeight =
        typeof window !== "undefined"
          ? window.innerHeight * MAX_PANEL_HEIGHT_PERCENT
          : 600;
      setPanelHeightState(maxHeight);
      setIsMaximized(true);
    }
  }, [isMaximized, panelHeight, preMaximizeHeight]);

  // Check if a session already exists for the given context
  const getExistingSession = useCallback(
    (context: ContextInfo): TerminalSession | null => {
      const sessionId = `${context.type}-${context.id}`;
      return sessions.find((s) => s.id === sessionId) || null;
    },
    [sessions],
  );

  const openTerminalForContext = useCallback((context: ContextInfo) => {
    const sessionId = `${context.type}-${context.id}`;

    setSessions((prev) => {
      // Check if session already exists
      const existingSession = prev.find((s) => s.id === sessionId);
      if (existingSession) {
        // Session exists - update metadata that may have changed
        // (e.g., displayKey or projectRef that weren't available initially)
        const needsUpdate =
          (context.displayKey && !existingSession.displayKey) ||
          (context.projectRef && !existingSession.projectRef) ||
          (context.agent && !existingSession.agent);

        if (needsUpdate) {
          return prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  displayKey: context.displayKey || s.displayKey,
                  projectRef: context.projectRef || s.projectRef,
                  agent: context.agent || s.agent,
                }
              : s,
          );
        }
        return prev;
      }
      // Create new session
      return [
        ...prev,
        {
          id: sessionId,
          contextType: context.type,
          contextId: context.id,
          contextTitle: context.title,
          displayKey: context.displayKey,
          projectRef: context.projectRef,
          agent: context.agent,
          workingDirectory: context.workingDirectory,
          initialCommand: context.initialCommand,
          isRunning: false,
          isConnected: false,
        },
      ];
    });

    setActiveSessionId(sessionId);
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  const closeSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const newSessions = prev.filter((s) => s.id !== sessionId);
        return newSessions;
      });

      setActiveSessionId((prevActive) => {
        if (prevActive === sessionId) {
          // Switch to another session or null
          const remaining = sessions.filter((s) => s.id !== sessionId);
          return remaining.length > 0
            ? remaining[remaining.length - 1].id
            : null;
        }
        return prevActive;
      });
    },
    [sessions],
  );

  const switchToSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const updateSessionStatus = useCallback(
    (
      sessionId: string,
      status: { isRunning?: boolean; isConnected?: boolean },
    ) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                ...(status.isRunning !== undefined && {
                  isRunning: status.isRunning,
                }),
                ...(status.isConnected !== undefined && {
                  isConnected: status.isConnected,
                }),
              }
            : s,
        ),
      );
    },
    [],
  );

  // Derive active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const isRunning = activeSession?.isRunning ?? false;

  const setIsRunning = useCallback(
    (running: boolean) => {
      if (activeSessionId) {
        updateSessionStatus(activeSessionId, { isRunning: running });
      }
    },
    [activeSessionId, updateSessionStatus],
  );

  // Get suggested commands based on current page context
  const suggestedCommands = getSuggestedCommands(pageContext);

  const value: TerminalContextValue = {
    isOpen,
    isCollapsed,
    panelHeight,
    isMaximized,
    togglePanel,
    openPanel,
    closePanel,
    toggleCollapse,
    setPanelHeight,
    toggleMaximize,
    sessions,
    activeSessionId,
    getExistingSession,
    openTerminalForContext,
    closeSession,
    switchToSession,
    updateSessionStatus,
    pageContext,
    setPageContext,
    suggestedCommands,
    activeSession,
    isRunning,
    setIsRunning,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return context;
}
