import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface TaskInfo {
  id: number;
  title: string;
}

interface TerminalContextValue {
  // Panel state
  isOpen: boolean;
  isCollapsed: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleCollapse: () => void;

  // Session state (single session for Phase 1)
  activeTask: TaskInfo | null;
  setActiveTask: (task: TaskInfo | null) => void;
  openTerminalForTask: (task: TaskInfo) => void;

  // Terminal status (passed up from Terminal component)
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

  const [activeTask, setActiveTask] = useState<TaskInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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
    setActiveTask(task);
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  const value: TerminalContextValue = {
    isOpen,
    isCollapsed,
    togglePanel,
    openPanel,
    closePanel,
    toggleCollapse,
    activeTask,
    setActiveTask,
    openTerminalForTask,
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
