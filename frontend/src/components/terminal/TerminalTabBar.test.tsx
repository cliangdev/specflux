import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TerminalTabBar from "./TerminalTabBar";
import type { TerminalSession } from "../../contexts/TerminalContext";

const mockSessions: TerminalSession[] = [
  {
    id: "task-1",
    taskId: 1,
    taskTitle: "Fix login bug",
    isRunning: false,
    isConnected: true,
  },
  {
    id: "task-2",
    taskId: 2,
    taskTitle: "Add search feature",
    isRunning: true,
    isConnected: true,
  },
  {
    id: "task-3",
    taskId: 3,
    taskTitle: "Refactor authentication module to use new OAuth flow",
    isRunning: false,
    isConnected: false,
  },
];

describe("TerminalTabBar", () => {
  const mockOnSwitchSession = vi.fn();
  const mockOnCloseSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when sessions is empty", () => {
    const { container } = render(
      <TerminalTabBar
        sessions={[]}
        activeSessionId={null}
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders all session tabs", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    expect(screen.getByTestId("terminal-tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-tab-2")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-tab-3")).toBeInTheDocument();
  });

  it("displays task ID and title in each tab", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    expect(screen.getByText("#1: Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("#2: Add search feature")).toBeInTheDocument();
  });

  it("truncates long titles", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    // The third session has a long title that should be truncated to 20 chars + "..."
    expect(
      screen.getByText(/^#3: Refactor authenticat\.\.\.$/),
    ).toBeInTheDocument();
  });

  it("shows running indicator for running sessions", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    // Session 2 is running, should have indicator
    expect(screen.getByTestId("terminal-tab-running-2")).toBeInTheDocument();

    // Session 1 is not running, should not have indicator
    expect(
      screen.queryByTestId("terminal-tab-running-1"),
    ).not.toBeInTheDocument();
  });

  it("calls onSwitchSession when clicking a tab", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    fireEvent.click(screen.getByTestId("terminal-tab-2"));

    expect(mockOnSwitchSession).toHaveBeenCalledWith("task-2");
  });

  it("calls onCloseSession when clicking close button", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    fireEvent.click(screen.getByTestId("terminal-tab-close-2"));

    expect(mockOnCloseSession).toHaveBeenCalledWith("task-2");
    // Should not switch session
    expect(mockOnSwitchSession).not.toHaveBeenCalled();
  });

  it("highlights active tab differently", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-2"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    const activeTab = screen.getByTestId("terminal-tab-2");
    const inactiveTab = screen.getByTestId("terminal-tab-1");

    // Active tab should have different background class
    expect(activeTab.className).toContain("bg-slate-900");
    expect(inactiveTab.className).toContain("bg-slate-700");
  });

  it("shows keyboard shortcut hint in title attribute", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    const tab1 = screen.getByTestId("terminal-tab-1");
    const tab2 = screen.getByTestId("terminal-tab-2");

    expect(tab1.getAttribute("title")).toContain("Cmd+1");
    expect(tab2.getAttribute("title")).toContain("Cmd+2");
  });
});
