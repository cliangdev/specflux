import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DuplicateSessionDialog from "../DuplicateSessionDialog";
import type { TerminalSession } from "../../../contexts/TerminalContext";

const mockSession: TerminalSession = {
  id: "task-1",
  contextType: "task",
  contextId: "task_1",
  contextTitle: "Fix login bug",
  displayKey: "SPEC-T1",
  taskId: "task_1",
  taskTitle: "Fix login bug",
  isRunning: false,
  isConnected: true,
};

describe("DuplicateSessionDialog", () => {
  const mockOnOpenExisting = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog with session info", () => {
    render(
      <DuplicateSessionDialog
        existingSession={mockSession}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByTestId("duplicate-session-dialog")).toBeInTheDocument();
    expect(screen.getByText(/SPEC-T1/)).toBeInTheDocument();
    expect(screen.getByText(/Fix login bug/)).toBeInTheDocument();
  });

  it("shows displayKey in title", () => {
    render(
      <DuplicateSessionDialog
        existingSession={mockSession}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    expect(
      screen.getByText("Session already exists for SPEC-T1"),
    ).toBeInTheDocument();
  });

  it("falls back to contextId when displayKey is missing", () => {
    const sessionWithoutDisplayKey: TerminalSession = {
      ...mockSession,
      displayKey: undefined,
    };

    render(
      <DuplicateSessionDialog
        existingSession={sessionWithoutDisplayKey}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    expect(
      screen.getByText("Session already exists for #task_1"),
    ).toBeInTheDocument();
  });

  it("calls onOpenExisting when Open Existing button clicked", () => {
    render(
      <DuplicateSessionDialog
        existingSession={mockSession}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.click(screen.getByTestId("duplicate-session-open"));
    expect(mockOnOpenExisting).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel button clicked", () => {
    render(
      <DuplicateSessionDialog
        existingSession={mockSession}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.click(screen.getByTestId("duplicate-session-cancel"));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop clicked", () => {
    render(
      <DuplicateSessionDialog
        existingSession={mockSession}
        onOpenExisting={mockOnOpenExisting}
        onCancel={mockOnCancel}
      />,
    );

    // Click the backdrop (first div with bg-black/50)
    const backdrop = document.querySelector(".bg-black\\/50");
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
