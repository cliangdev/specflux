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

// Mock the DuplicateSessionDialog component
vi.mock("../DuplicateSessionDialog", () => ({
  default: ({
    onOpenExisting,
    onCancel,
  }: {
    existingSession: { id: string };
    onOpenExisting: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="duplicate-session-dialog">
      <button onClick={onOpenExisting}>Open Existing</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock the TerminalContext
const mockTerminalContext = {
  isOpen: true,
  isCollapsed: false,
  panelHeight: 320,
  panelWidth: 480,
  panelPosition: "bottom" as "bottom" | "left" | "right",
  isMaximized: false,
  sessions: [] as Array<{
    id: string;
    contextType: "task" | "epic" | "project" | "prd-workshop";
    contextId: number | string;
    contextTitle: string;
    taskId: number | string;
    taskTitle: string;
    isRunning: boolean;
    isConnected: boolean;
  }>,
  activeSessionId: null as string | null,
  togglePanel: vi.fn(),
  openPanel: vi.fn(),
  closePanel: vi.fn(),
  toggleCollapse: vi.fn(),
  setPanelHeight: vi.fn(),
  setPanelWidth: vi.fn(),
  setPanelPosition: vi.fn(),
  toggleMaximize: vi.fn(),
  openTerminalForTask: vi.fn(),
  openTerminalForContext: vi.fn(),
  switchToSession: vi.fn(),
  closeSession: vi.fn(),
  updateSessionStatus: vi.fn(),
  getExistingSession: vi.fn().mockReturnValue(null),
  pageContext: null as { type: string; id?: string | number; title?: string } | null,
  setPageContext: vi.fn(),
  suggestedCommands: [] as Array<{ label: string; command: string; description?: string }>,
};

vi.mock("../../../contexts/TerminalContext", () => ({
  useTerminal: () => mockTerminalContext,
}));

// Mock the ProjectContext
const mockProjectContext = {
  currentProject: null as { id: string; projectKey: string; name: string; localPath?: string } | null,
  projects: [],
  loading: false,
  setCurrentProject: vi.fn(),
  refreshProjects: vi.fn(),
  getProjectRef: vi.fn().mockReturnValue("test-project"),
};

vi.mock("../../../contexts", () => ({
  useProject: () => mockProjectContext,
}));

describe("TerminalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminalContext.isCollapsed = false;
    mockTerminalContext.panelPosition = "bottom";
    mockTerminalContext.sessions = [];
    mockTerminalContext.activeSessionId = null;
    mockTerminalContext.pageContext = null;
    mockProjectContext.currentProject = null;
  });

  it("renders panel with header", () => {
    render(<TerminalPanel />);

    // Panel renders with branding emoji
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
  });

  it("shows collapse button when expanded", () => {
    render(<TerminalPanel />);

    expect(screen.getByTestId("claude-panel-collapse-btn")).toBeInTheDocument();
    expect(screen.getByTitle("Collapse")).toBeInTheDocument();
  });

  it("shows expand button when collapsed", () => {
    mockTerminalContext.isCollapsed = true;

    render(<TerminalPanel />);

    expect(screen.getByTitle("Expand")).toBeInTheDocument();
  });

  it("shows close button", () => {
    render(<TerminalPanel />);

    expect(screen.getByTestId("claude-panel-close-btn")).toBeInTheDocument();
    expect(screen.getByTitle("Close panel (⌘T)")).toBeInTheDocument();
  });

  it("calls closePanel when close button clicked", () => {
    render(<TerminalPanel />);

    fireEvent.click(screen.getByTestId("claude-panel-close-btn"));

    expect(mockTerminalContext.closePanel).toHaveBeenCalledTimes(1);
  });

  it("calls toggleCollapse when collapse button clicked", () => {
    render(<TerminalPanel />);

    fireEvent.click(screen.getByTestId("claude-panel-collapse-btn"));

    expect(mockTerminalContext.toggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("shows placeholder when no sessions exist", () => {
    render(<TerminalPanel />);

    expect(screen.getByText("No active session")).toBeInTheDocument();
    expect(
      screen.getByText('Open a task and click "Launch Agent" to start'),
    ).toBeInTheDocument();
  });

  it("shows tab bar when sessions exist", () => {
    mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
    mockTerminalContext.sessions = [
      {
        id: "task-42",
        contextType: "task",
        contextId: 42,
        contextTitle: "My Test Task",
        taskId: 42,
        taskTitle: "My Test Task",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-42";

    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-tab-bar")).toBeInTheDocument();
  });

  it("renders Terminal component for active session", () => {
    mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
    mockTerminalContext.sessions = [
      {
        id: "task-123",
        contextType: "task",
        contextId: 123,
        contextTitle: "Active Task",
        taskId: 123,
        taskTitle: "Active Task",
        projectRef: "proj_1",
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
    mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
    mockTerminalContext.isCollapsed = true;
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: 1,
        contextTitle: "Task",
        taskId: 1,
        taskTitle: "Task",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<TerminalPanel />);

    expect(screen.queryByTestId("terminal-mock")).not.toBeInTheDocument();
    expect(screen.queryByText("No active session")).not.toBeInTheDocument();
  });

  it("fills its container when expanded", () => {
    mockTerminalContext.panelHeight = 320;
    render(<TerminalPanel />);

    const panel = screen.getByTestId("terminal-panel");
    // Panel now fills container - sizing is controlled by MainLayout
    expect(panel).toHaveStyle({ height: "100%", width: "100%" });
  });

  it("fills its container when collapsed", () => {
    mockTerminalContext.isCollapsed = true;

    render(<TerminalPanel />);

    const panel = screen.getByTestId("terminal-panel");
    // Panel fills container - MainLayout handles collapsed size
    expect(panel).toHaveStyle({ height: "100%", width: "100%" });
  });

  describe("New Session Button", () => {
    it("shows new session button when project is selected and page context has id", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
      mockTerminalContext.pageContext = { type: "task-detail", id: "task_123", title: "SPEC-T1" };

      render(<TerminalPanel />);

      expect(screen.getByTestId("new-session-btn")).toBeInTheDocument();
      expect(screen.getByTitle("New session for SPEC-T1")).toBeInTheDocument();
    });

    it("does not show new session button when no project is selected", () => {
      mockProjectContext.currentProject = null;
      mockTerminalContext.pageContext = { type: "task-detail", id: "task_123", title: "SPEC-T1" };

      render(<TerminalPanel />);

      expect(screen.queryByTestId("new-session-btn")).not.toBeInTheDocument();
    });

    it("does not show new session button when page context has no id", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
      mockTerminalContext.pageContext = { type: "tasks" }; // list page, no id

      render(<TerminalPanel />);

      expect(screen.queryByTestId("new-session-btn")).not.toBeInTheDocument();
    });

    it("creates session directly when + button is clicked", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project", localPath: "/path/to/project" };
      mockTerminalContext.pageContext = { type: "task-detail", id: "task_123", title: "SPEC-T1" };

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));

      expect(mockTerminalContext.openTerminalForContext).toHaveBeenCalledWith({
        type: "task",
        id: "task_123",
        title: "SPEC-T1",
        displayKey: "SPEC-T1",
        projectRef: "test-project",
        workingDirectory: "/path/to/project",
        initialCommand: "claude",
      });
    });

    it("uses id as fallback when title is empty", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project", localPath: "/path/to/project" };
      // pageContext has id but no title
      mockTerminalContext.pageContext = { type: "prd-detail", id: "prd_abc123" };

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));

      expect(mockTerminalContext.openTerminalForContext).toHaveBeenCalledWith({
        type: "prd-workshop",
        id: "prd_abc123",
        title: "prd_abc123", // Falls back to id
        displayKey: "prd_abc123", // Falls back to id
        projectRef: "test-project",
        workingDirectory: "/path/to/project",
        initialCommand: "claude",
      });
    });

    it("shows duplicate session warning when session already exists", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project", localPath: "/path/to/project" };
      mockTerminalContext.pageContext = { type: "task-detail", id: "task_123", title: "SPEC-T1" };
      mockTerminalContext.sessions = [
        {
          id: "task-task_123",
          contextType: "task",
          contextId: "task_123",
          contextTitle: "SPEC-T1",
          taskId: "task_123",
          taskTitle: "SPEC-T1",
          projectRef: "proj_1",
          isRunning: false,
          isConnected: true,
        },
      ];

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));

      expect(screen.getByTestId("duplicate-session-dialog")).toBeInTheDocument();
      expect(mockTerminalContext.openTerminalForContext).not.toHaveBeenCalled();
    });

    it("switches to existing session when Open Existing is clicked in duplicate dialog", () => {
      mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project", localPath: "/path/to/project" };
      mockTerminalContext.pageContext = { type: "task-detail", id: "task_123", title: "SPEC-T1" };
      mockTerminalContext.sessions = [
        {
          id: "task-task_123",
          contextType: "task",
          contextId: "task_123",
          contextTitle: "SPEC-T1",
          taskId: "task_123",
          taskTitle: "SPEC-T1",
          projectRef: "proj_1",
          isRunning: false,
          isConnected: true,
        },
      ];

      render(<TerminalPanel />);

      fireEvent.click(screen.getByTestId("new-session-btn"));
      fireEvent.click(screen.getByText("Open Existing"));

      expect(mockTerminalContext.switchToSession).toHaveBeenCalledWith("task-task_123");
    });
  });
});
