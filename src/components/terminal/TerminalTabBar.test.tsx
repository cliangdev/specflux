import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TerminalTabBar from "./TerminalTabBar";
import type { TerminalSession } from "../../contexts/TerminalContext";

const mockSessions: TerminalSession[] = [
  {
    id: "task-1",
    contextType: "task",
    contextId: "task_1",
    contextTitle: "Fix login bug",
    displayKey: "SPEC-T1",
    isRunning: false,
    isConnected: true,
  },
  {
    id: "task-2",
    contextType: "task",
    contextId: "task_2",
    contextTitle: "Add search",
    displayKey: "SPEC-T2",
    isRunning: true,
    isConnected: true,
  },
  {
    id: "task-3",
    contextType: "task",
    contextId: "task_3",
    contextTitle: "Refactor authentication module to use new OAuth flow",
    displayKey: "SPEC-T3",
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

    expect(screen.getByTestId("terminal-tab-task_1")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-tab-task_2")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-tab-task_3")).toBeInTheDocument();
  });

  it("displays displayKey in each tab", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    // Tab labels now show just displayKey, not "displayKey: title"
    expect(screen.getByText("SPEC-T1")).toBeInTheDocument();
    expect(screen.getByText("SPEC-T2")).toBeInTheDocument();
    expect(screen.getByText("SPEC-T3")).toBeInTheDocument();
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
    expect(screen.getByTestId("terminal-tab-running-task_2")).toBeInTheDocument();

    // Session 1 is not running, should not have indicator
    expect(
      screen.queryByTestId("terminal-tab-running-task_1"),
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

    fireEvent.click(screen.getByTestId("terminal-tab-task_2"));

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

    fireEvent.click(screen.getByTestId("terminal-tab-close-task_2"));

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

    const activeTab = screen.getByTestId("terminal-tab-task_2");
    const inactiveTab = screen.getByTestId("terminal-tab-task_1");

    // Active tab should have different background class
    expect(activeTab.className).toContain("bg-slate-900");
    expect(inactiveTab.className).toContain("bg-slate-700");
  });

  it("shows keyboard shortcut hint and full title in title attribute", () => {
    render(
      <TerminalTabBar
        sessions={mockSessions}
        activeSessionId="task-1"
        onSwitchSession={mockOnSwitchSession}
        onCloseSession={mockOnCloseSession}
      />,
    );

    const tab1 = screen.getByTestId("terminal-tab-task_1");
    const tab2 = screen.getByTestId("terminal-tab-task_2");

    // Title should include displayKey, full title (if different), and shortcut
    expect(tab1.getAttribute("title")).toContain("SPEC-T1");
    expect(tab1.getAttribute("title")).toContain("Fix login bug");
    expect(tab1.getAttribute("title")).toContain("⌘1");
    expect(tab2.getAttribute("title")).toContain("⌘2");
  });
});
