import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface TaskInfo {
  id: number | string; // v1 uses number, v2 uses publicId string
  title: string;
}

export type ContextType = "task" | "epic" | "project";

export interface AgentInfo {
  id: number | string; // v1 uses number, v2 uses publicId string
  name: string;
  emoji: string;
}

export interface ContextInfo {
  type: ContextType;
  id: number | string; // v1 uses number, v2 uses publicId string
  title: string;
  agent?: AgentInfo;
}

export interface TerminalSession {
  id: string; // e.g., "task-123", "epic-5", "project-2"
  contextType: ContextType;
  contextId: number | string; // v1 uses number, v2 uses publicId string
  contextTitle: string;
  // Agent assigned to this session (for task contexts)
  agent?: AgentInfo;
  // Backwards compatibility aliases
  taskId: number | string; // v1 uses number, v2 uses publicId string
  taskTitle: string;
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
  openTerminalForContext: (context: ContextInfo) => void;
  openTerminalForTask: (task: TaskInfo) => void; // Backwards compat
  closeSession: (sessionId: string) => void;
  switchToSession: (sessionId: string) => void;
  updateSessionStatus: (
    sessionId: string,
    status: { isRunning?: boolean; isConnected?: boolean },
  ) => void;

  // Backwards compatibility - returns active session's task info
  activeTask: TaskInfo | null;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

const STORAGE_KEY = "specflux-terminal-panel";

// Panel height constants
const DEFAULT_PANEL_HEIGHT = 320;
const MIN_PANEL_HEIGHT = 100;
const MAX_PANEL_HEIGHT_PERCENT = 0.8;

interface StoredSession {
  id: string;
  contextType: ContextType;
  contextId: number | string; // v1 uses number, v2 uses publicId string
  contextTitle: string;
  agent?: AgentInfo;
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

  // Multi-tab session state - restore from localStorage
  const [sessions, setSessions] = useState<TerminalSession[]>(() => {
    const stored = getStoredState();
    if (stored.sessions && Array.isArray(stored.sessions)) {
      return stored.sessions.map((s) => ({
        id: s.id,
        contextType: s.contextType,
        contextId: s.contextId,
        contextTitle: s.contextTitle,
        agent: s.agent,
        taskId: s.contextId,
        taskTitle: s.contextTitle,
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
      agent: s.agent,
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

  const openTerminalForContext = useCallback((context: ContextInfo) => {
    const sessionId = `${context.type}-${context.id}`;

    setSessions((prev) => {
      // Check if session already exists
      const existingSession = prev.find((s) => s.id === sessionId);
      if (existingSession) {
        // Session exists, update agent if provided and switch to it
        if (context.agent && !existingSession.agent) {
          return prev.map((s) =>
            s.id === sessionId ? { ...s, agent: context.agent } : s,
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
          agent: context.agent,
          // Backwards compat aliases
          taskId: context.id,
          taskTitle: context.title,
          isRunning: false,
          isConnected: false,
        },
      ];
    });

    setActiveSessionId(sessionId);
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  // Backwards compatibility wrapper
  const openTerminalForTask = useCallback(
    (task: TaskInfo) => {
      openTerminalForContext({ type: "task", id: task.id, title: task.title });
    },
    [openTerminalForContext],
  );

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

  // Backwards compatibility: derive activeTask from sessions
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeTask: TaskInfo | null = activeSession
    ? { id: activeSession.taskId, title: activeSession.taskTitle }
    : null;
  const isRunning = activeSession?.isRunning ?? false;

  const setIsRunning = useCallback(
    (running: boolean) => {
      if (activeSessionId) {
        updateSessionStatus(activeSessionId, { isRunning: running });
      }
    },
    [activeSessionId, updateSessionStatus],
  );

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
    openTerminalForContext,
    openTerminalForTask,
    closeSession,
    switchToSession,
    updateSessionStatus,
    activeTask,
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
