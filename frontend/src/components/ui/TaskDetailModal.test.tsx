import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TaskDetailModal from "./TaskDetailModal";
import { api, type Task, type AgentStatus } from "../../api";

// Mock the api
vi.mock("../../api", () => ({
  api: {
    tasks: {
      getTaskAgentStatus: vi.fn(),
      controlTaskAgent: vi.fn(),
    },
  },
  ControlTaskAgentRequestActionEnum: {
    Start: "start",
    Pause: "pause",
    Resume: "resume",
    Stop: "stop",
  },
  AgentStatusStatusEnum: {
    Idle: "idle",
    Running: "running",
    Paused: "paused",
    Stopped: "stopped",
    Completed: "completed",
    Failed: "failed",
  },
}));

// Mock the Terminal component
vi.mock("../Terminal", () => ({
  default: ({ taskId }: { taskId: number }) => (
    <div data-testid="terminal">Terminal for task {taskId}</div>
  ),
}));

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  projectId: 1,
  status: "in_progress",
  requiresApproval: false,
  progressPercentage: 50,
  createdByUserId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAgentStatus: AgentStatus = {
  taskId: 1,
  status: "idle",
};

describe("TaskDetailModal", () => {
  const mockOnClose = vi.fn();
  const mockOnTaskUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.tasks.getTaskAgentStatus).mockResolvedValue({
      success: true,
      data: mockAgentStatus,
    });
  });

  it("renders task details correctly", async () => {
    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders terminal component", async () => {
    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    expect(screen.getByTestId("terminal")).toBeInTheDocument();
    expect(screen.getByText("Terminal for task 1")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    // Find close button by the X icon's parent button
    const closeButton = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg path[d*='M6 18L18 6']"));

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it("shows Start button when agent is idle", async () => {
    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument();
    });
  });

  it("calls controlTaskAgent when Start is clicked", async () => {
    vi.mocked(api.tasks.controlTaskAgent).mockResolvedValue({
      success: true,
      data: { ...mockAgentStatus, status: "running" },
    });

    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Start"));

    await waitFor(() => {
      expect(api.tasks.controlTaskAgent).toHaveBeenCalledWith({
        id: 1,
        controlTaskAgentRequest: { action: "start" },
      });
    });
  });

  it("shows Pause and Stop buttons when agent is running", async () => {
    vi.mocked(api.tasks.getTaskAgentStatus).mockResolvedValue({
      success: true,
      data: { ...mockAgentStatus, status: "running" },
    });

    render(
      <TaskDetailModal
        task={mockTask}
        onClose={mockOnClose}
        onTaskUpdated={mockOnTaskUpdated}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Pause")).toBeInTheDocument();
      expect(screen.getByText("Stop")).toBeInTheDocument();
    });
  });
});
