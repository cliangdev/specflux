import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TerminalPanel from "../TerminalPanel";

// Mock the Terminal component
vi.mock("../../Terminal", () => ({
  default: ({
    contextType,
    contextId,
  }: {
    contextType: string;
    contextId: number;
  }) => (
    <div data-testid="terminal-mock">
      Terminal for {contextType} {contextId}
    </div>
  ),
}));

// Mock the TerminalTabBar component
vi.mock("../TerminalTabBar", () => ({
  default: ({
    sessions,
    activeSessionId,
  }: {
    sessions: Array<{ id: string; taskId: number; label: string }>;
    activeSessionId: string | null;
  }) => (
    <div data-testid="terminal-tab-bar">
      {sessions.map((s) => (
        <span key={s.id} data-testid={`tab-${s.id}`}>
          {s.label} {s.id === activeSessionId && "(active)"}
        </span>
      ))}
    </div>
  ),
}));

// Mock the NewSessionDialog component
vi.mock("../NewSessionDialog", () => ({
  default: ({
    onClose,
    onCreated,
  }: {
    onClose: () => void;
    onCreated: (context: { type: string; id: number; title: string }) => void;
  }) => (
    <div data-testid="new-session-dialog">
      <button onClick={onClose}>Close Dialog</button>
      <button
        onClick={() => onCreated({ type: "task", id: 99, title: "Test Task" })}
      >
        Create Session
      </button>
    </div>
  ),
}));

// Mock the TerminalContext
const mockTerminalContext = {
  isOpen: true,
  isCollapsed: false,
  sessions: [] as Array<{
    id: string;
    contextType: "task" | "epic" | "project";
    contextId: number;
    contextTitle: string;
    taskId: number;
    taskTitle: string;
    isRunning: boolean;
    isConnected: boolean;
  }>,
  activeSessionId: null as string | null,
  togglePanel: vi.fn(),
  openPanel: vi.fn(),
  closePanel: vi.fn(),
  toggleCollapse: vi.fn(),
  openTerminalForTask: vi.fn(),
  openTerminalForContext: vi.fn(),
  switchToSession: vi.fn(),
  closeSession: vi.fn(),
  updateSessionStatus: vi.fn(),
};

vi.mock("../../../contexts/TerminalContext", () => ({
  useTerminal: () => mockTerminalContext,
}));

// Mock the ProjectContext
const mockProjectContext = {
  currentProject: null as { id: number; name: string } | null,
  projects: [],
  loading: false,
  setCurrentProject: vi.fn(),
  refreshProjects: vi.fn(),
};

vi.mock("../../../contexts", () => ({
  useProject: () => mockProjectContext,
}));

describe("TerminalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminalContext.isCollapsed = false;
    mockTerminalContext.sessions = [];
    mockTerminalContext.activeSessionId = null;
    mockProjectContext.currentProject = null;
  });

  it("renders terminal panel with header", () => {
    render(<TerminalPanel />);

    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
  });

  it("shows collapse button when expanded", () => {
    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-collapse-btn")).toBeInTheDocument();
    expect(screen.getByTitle("Collapse")).toBeInTheDocument();
  });

  it("shows expand button when collapsed", () => {
    mockTerminalContext.isCollapsed = true;

    render(<TerminalPanel />);

    expect(screen.getByTitle("Expand")).toBeInTheDocument();
  });

  it("shows close button", () => {
    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-close-btn")).toBeInTheDocument();
    expect(screen.getByTitle("Close terminal (⌘T)")).toBeInTheDocument();
  });

  it("calls closePanel when close button clicked", () => {
    render(<TerminalPanel />);

    fireEvent.click(screen.getByTestId("terminal-close-btn"));

    expect(mockTerminalContext.closePanel).toHaveBeenCalledTimes(1);
  });

  it("calls toggleCollapse when collapse button clicked", () => {
    render(<TerminalPanel />);

    fireEvent.click(screen.getByTestId("terminal-collapse-btn"));

    expect(mockTerminalContext.toggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("shows placeholder when no sessions exist", () => {
    render(<TerminalPanel />);

    expect(screen.getByText("No task selected")).toBeInTheDocument();
    expect(
      screen.getByText('Open a task and click "Open in Terminal" to start'),
    ).toBeInTheDocument();
  });

  it("shows tab bar when sessions exist", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-42",
        contextType: "task",
        contextId: 42,
        contextTitle: "My Test Task",
        taskId: 42,
        taskTitle: "My Test Task",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-42";

    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-tab-bar")).toBeInTheDocument();
  });

  it("renders Terminal component for active session", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-123",
        contextType: "task",
        contextId: 123,
        contextTitle: "Active Task",
        taskId: 123,
        taskTitle: "Active Task",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-123";

    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-mock")).toBeInTheDocument();
    expect(screen.getByText("Terminal for task 123")).toBeInTheDocument();
  });

  it("hides terminal content when collapsed", () => {
    mockTerminalContext.isCollapsed = true;
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: 1,
        contextTitle: "Task",
        taskId: 1,
        taskTitle: "Task",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<TerminalPanel />);

    expect(screen.queryByTestId("terminal-mock")).not.toBeInTheDocument();
    expect(screen.queryByText("No task selected")).not.toBeInTheDocument();
  });

  it("has correct height when expanded", () => {
    render(<TerminalPanel />);

    const panel = screen.getByTestId("terminal-panel");
    expect(panel).toHaveClass("h-80");
  });

  it("has correct height when collapsed", () => {
    mockTerminalContext.isCollapsed = true;

    render(<TerminalPanel />);

    const panel = screen.getByTestId("terminal-panel");
    expect(panel).toHaveClass("h-10");
  });

  describe("New Session Button", () => {
    it("shows new session button when project is selected", () => {
      mockProjectContext.currentProject = { id: 1, name: "Test Project" };

      render(<TerminalPanel />);

      expect(screen.getByTestId("new-session-btn")).toBeInTheDocument();
      expect(screen.getByTitle("New session")).toBeInTheDocument();
    });

    it("does not show new session button when no project is selected", () => {
      mockProjectContext.currentProject = null;

      render(<TerminalPanel />);

      expect(screen.queryByTestId("new-session-btn")).not.toBeInTheDocument();
    });

    it("opens new session dialog when + button is clicked", () => {
      mockProjectContext.currentProject = { id: 1, name: "Test Project" };

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));

      expect(screen.getByTestId("new-session-dialog")).toBeInTheDocument();
    });

    it("closes dialog when close is clicked", () => {
      mockProjectContext.currentProject = { id: 1, name: "Test Project" };

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));
      expect(screen.getByTestId("new-session-dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Close Dialog"));
      expect(
        screen.queryByTestId("new-session-dialog"),
      ).not.toBeInTheDocument();
    });

    it("calls openTerminalForContext and closes dialog when session is created", () => {
      mockProjectContext.currentProject = { id: 1, name: "Test Project" };

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));
      fireEvent.click(screen.getByText("Create Session"));

      expect(mockTerminalContext.openTerminalForContext).toHaveBeenCalledWith({
        type: "task",
        id: 99,
        title: "Test Task",
      });
      expect(
        screen.queryByTestId("new-session-dialog"),
      ).not.toBeInTheDocument();
    });
  });
});
