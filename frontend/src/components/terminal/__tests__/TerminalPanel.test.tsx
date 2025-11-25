import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TerminalPanel from "../TerminalPanel";

// Mock the Terminal component
vi.mock("../../Terminal", () => ({
  default: ({ taskId }: { taskId: number }) => (
    <div data-testid="terminal-mock">Terminal for task {taskId}</div>
  ),
}));

// Mock the TerminalContext
const mockTerminalContext = {
  isOpen: true,
  isCollapsed: false,
  activeTask: null as { id: number; title: string } | null,
  isRunning: false,
  togglePanel: vi.fn(),
  openPanel: vi.fn(),
  closePanel: vi.fn(),
  toggleCollapse: vi.fn(),
  setActiveTask: vi.fn(),
  openTerminalForTask: vi.fn(),
  setIsRunning: vi.fn(),
};

vi.mock("../../../contexts/TerminalContext", () => ({
  useTerminal: () => mockTerminalContext,
}));

describe("TerminalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminalContext.isCollapsed = false;
    mockTerminalContext.activeTask = null;
    mockTerminalContext.isRunning = false;
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
    expect(screen.getByTitle("Close terminal (Cmd+`)")).toBeInTheDocument();
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

  it("shows placeholder when no task selected", () => {
    render(<TerminalPanel />);

    expect(screen.getByText("No task selected")).toBeInTheDocument();
    expect(
      screen.getByText('Open a task and click "Open in Terminal" to start'),
    ).toBeInTheDocument();
  });

  it("shows task info in header when task is active", () => {
    mockTerminalContext.activeTask = { id: 42, title: "My Test Task" };

    render(<TerminalPanel />);

    expect(screen.getByText("#42: My Test Task")).toBeInTheDocument();
  });

  it("shows running indicator when agent is running", () => {
    mockTerminalContext.activeTask = { id: 1, title: "Task" };
    mockTerminalContext.isRunning = true;

    render(<TerminalPanel />);

    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders Terminal component when task is active", () => {
    mockTerminalContext.activeTask = { id: 123, title: "Active Task" };

    render(<TerminalPanel />);

    expect(screen.getByTestId("terminal-mock")).toBeInTheDocument();
    expect(screen.getByText("Terminal for task 123")).toBeInTheDocument();
  });

  it("hides terminal content when collapsed", () => {
    mockTerminalContext.isCollapsed = true;
    mockTerminalContext.activeTask = { id: 1, title: "Task" };

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
});
