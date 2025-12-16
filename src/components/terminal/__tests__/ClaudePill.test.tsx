import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClaudePill from "../ClaudePill";
import type { TerminalSession } from "../../../contexts/TerminalContext";

// Mock the TerminalContext
const mockTerminalContext = {
  isOpen: false,
  sessions: [] as TerminalSession[],
  activeSessionId: null as string | null,
  openPanel: vi.fn(),
};

vi.mock("../../../contexts/TerminalContext", () => ({
  useTerminal: () => mockTerminalContext,
}));

// Mock the ProjectContext
const mockProjectContext = {
  currentProject: { id: "proj_1", projectKey: "PROJ", name: "Test Project" } as { id: string; projectKey: string; name: string } | null,
};

vi.mock("../../../contexts", () => ({
  useProject: () => mockProjectContext,
}));

describe("ClaudePill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminalContext.isOpen = false;
    mockTerminalContext.sessions = [];
    mockTerminalContext.activeSessionId = null;
    mockProjectContext.currentProject = { id: "proj_1", projectKey: "PROJ", name: "Test Project" };
  });

  it("renders when panel is closed", () => {
    render(<ClaudePill />);
    expect(screen.getByTestId("claude-pill")).toBeInTheDocument();
  });

  it("does not render when panel is open", () => {
    mockTerminalContext.isOpen = true;
    render(<ClaudePill />);
    expect(screen.queryByTestId("claude-pill")).not.toBeInTheDocument();
  });

  it("shows keyboard shortcut when no sessions", () => {
    render(<ClaudePill />);
    expect(screen.getByText("⌘T")).toBeInTheDocument();
  });

  it("shows displayKey when single session with displayKey", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: "task_1",
        contextTitle: "Fix login bug",
        displayKey: "SPEC-T1",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<ClaudePill />);
    expect(screen.getByText("SPEC-T1")).toBeInTheDocument();
  });

  it("shows session count when multiple sessions", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: "task_1",
        contextTitle: "Fix login bug",
        displayKey: "SPEC-T1",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
      {
        id: "task-2",
        contextType: "task",
        contextId: "task_2",
        contextTitle: "Add feature",
        displayKey: "SPEC-T2",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<ClaudePill />);
    expect(screen.getByText("2 chats")).toBeInTheDocument();
  });

  it("shows running indicator when session is running", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: "task_1",
        contextTitle: "Fix login bug",
        displayKey: "SPEC-T1",
        projectRef: "proj_1",
        isRunning: true,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<ClaudePill />);
    expect(screen.getByTestId("claude-pill-running")).toBeInTheDocument();
  });

  it("does not show running indicator when no session is running", () => {
    mockTerminalContext.sessions = [
      {
        id: "task-1",
        contextType: "task",
        contextId: "task_1",
        contextTitle: "Fix login bug",
        displayKey: "SPEC-T1",
        projectRef: "proj_1",
        isRunning: false,
        isConnected: true,
      },
    ];
    mockTerminalContext.activeSessionId = "task-1";

    render(<ClaudePill />);
    expect(screen.queryByTestId("claude-pill-running")).not.toBeInTheDocument();
  });

  it("calls openPanel when clicked", () => {
    render(<ClaudePill />);
    fireEvent.click(screen.getByTestId("claude-pill"));
    expect(mockTerminalContext.openPanel).toHaveBeenCalledTimes(1);
  });
});
