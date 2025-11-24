import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TaskCard } from "../TaskCard";
import {
  Task,
  TaskStatusEnum,
  TaskAgentStatusEnum,
} from "../../../api/generated/models/Task";

// Mock dnd-kit
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  status: TaskStatusEnum.InProgress,
  projectId: 1,
  requiresApproval: false,
  agentStatus: TaskAgentStatusEnum.Idle,
  progressPercentage: 0,
  createdByUserId: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("TaskCard", () => {
  it("renders task title", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders task ID", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("renders task description", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("shows running indicator when agent is running", () => {
    const runningTask: Task = {
      ...mockTask,
      agentStatus: TaskAgentStatusEnum.Running,
    };
    render(<TaskCard task={runningTask} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("does not show running indicator when agent is idle", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.queryByText("Running")).not.toBeInTheDocument();
  });

  it("shows progress bar when there is progress", () => {
    const taskWithProgress: Task = {
      ...mockTask,
      progressPercentage: 50,
    };
    render(<TaskCard task={taskWithProgress} />);
    // Progress bar should be rendered with width style
    const progressBar = document.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("shows repo name when present", () => {
    const taskWithRepo: Task = {
      ...mockTask,
      repoName: "backend",
    };
    render(<TaskCard task={taskWithRepo} />);
    expect(screen.getByText("backend")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    fireEvent.click(screen.getByText("Test Task"));
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });
});
