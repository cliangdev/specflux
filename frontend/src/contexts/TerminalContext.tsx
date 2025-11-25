import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface TaskInfo {
  id: number;
  title: string;
}

export interface TerminalSession {
  id: string; // e.g., "task-123"
  taskId: number;
  taskTitle: string;
  isRunning: boolean;
  isConnected: boolean;
}

interface TerminalContextValue {
  // Panel state
  isOpen: boolean;
  isCollapsed: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleCollapse: () => void;

  // Multi-tab session state
  sessions: TerminalSession[];
  activeSessionId: string | null;
  openTerminalForTask: (task: TaskInfo) => void;
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

interface StoredState {
  isOpen: boolean;
  isCollapsed: boolean;
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        return parsed.isOpen ?? false;
      }
    } catch {
      // Ignore parse errors
    }
    return false;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        return parsed.isCollapsed ?? false;
      }
    } catch {
      // Ignore parse errors
    }
    return false;
  });

  // Multi-tab session state
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Persist panel state to localStorage
  useEffect(() => {
    const state: StoredState = { isOpen, isCollapsed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isOpen, isCollapsed]);

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

  const openTerminalForTask = useCallback((task: TaskInfo) => {
    const sessionId = `task-${task.id}`;

    setSessions((prev) => {
      // Check if session already exists
      const existingSession = prev.find((s) => s.id === sessionId);
      if (existingSession) {
        // Session exists, just switch to it
        return prev;
      }
      // Create new session
      return [
        ...prev,
        {
          id: sessionId,
          taskId: task.id,
          taskTitle: task.title,
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
    togglePanel,
    openPanel,
    closePanel,
    toggleCollapse,
    sessions,
    activeSessionId,
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
