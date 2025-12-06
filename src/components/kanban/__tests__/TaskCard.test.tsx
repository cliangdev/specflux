import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TaskCard } from "../TaskCard";
import { Task, TaskStatus, TaskPriority } from "../../../api";

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
  id: "task_123",
  displayKey: "PROJ-1",
  title: "Test Task",
  description: "Test description",
  status: TaskStatus.InProgress,
  priority: TaskPriority.Medium,
  projectId: "proj_abc",
  requiresApproval: false,
  createdById: "user_1",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("TaskCard", () => {
  it("renders task title", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders task ID", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("#task_123")).toBeInTheDocument();
  });

  it("renders task description", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    fireEvent.click(screen.getByText("Test Task"));
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });

  it("renders without description when not provided", () => {
    const taskWithoutDescription: Task = {
      ...mockTask,
      description: undefined,
    };
    render(<TaskCard task={taskWithoutDescription} />);
    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.queryByText("Test description")).not.toBeInTheDocument();
  });

  it("shows avatar placeholder when task is assigned", () => {
    const assignedTask: Task = {
      ...mockTask,
      assignedToId: "user_2",
    };
    const { container } = render(<TaskCard task={assignedTask} />);
    // Check for avatar element (gradient div)
    const avatar = container.querySelector(".bg-gradient-to-tr");
    expect(avatar).toBeInTheDocument();
  });

  it("does not show avatar when task is unassigned", () => {
    const unassignedTask: Task = {
      ...mockTask,
      assignedToId: undefined,
    };
    const { container } = render(<TaskCard task={unassignedTask} />);
    const avatar = container.querySelector(".bg-gradient-to-tr");
    expect(avatar).not.toBeInTheDocument();
  });

  it("triggers context menu on right click", () => {
    const handleContextMenu = vi.fn();
    const { container } = render(
      <TaskCard task={mockTask} onContextMenu={handleContextMenu} />,
    );

    // Find the outermost clickable div (the card container)
    const card = container.querySelector("div");
    expect(card).not.toBeNull();
    fireEvent.contextMenu(card!);
    expect(handleContextMenu).toHaveBeenCalledWith(
      mockTask,
      expect.any(Number),
      expect.any(Number),
    );
  });
});
