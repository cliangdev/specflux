import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanBoard } from "../KanbanBoard";
import { TaskStatus, TaskPriority } from "../../../api";

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  rectIntersection: vi.fn(),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  verticalListSortingStrategy: {},
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

// Mock API response with v2 Task format
const mockTasks = [
  {
    id: "task_1",
    displayKey: "PROJ-1",
    title: "Task in Backlog",
    status: TaskStatus.Backlog,
    priority: TaskPriority.Medium,
    projectId: "proj_abc",
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "task_2",
    displayKey: "PROJ-2",
    title: "Task in Progress",
    status: TaskStatus.InProgress,
    priority: TaskPriority.High,
    projectId: "proj_abc",
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "task_3",
    displayKey: "PROJ-3",
    title: "Task Completed",
    status: TaskStatus.Completed,
    priority: TaskPriority.Low,
    projectId: "proj_abc",
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

vi.mock("../../../api", () => ({
  api: {
    tasks: {
      listTasks: vi.fn(() =>
        Promise.resolve({
          data: mockTasks,
        }),
      ),
      updateTask: vi.fn(() => Promise.resolve({})),
    },
  },
  TaskStatus: {
    Backlog: "BACKLOG",
    Ready: "READY",
    InProgress: "IN_PROGRESS",
    InReview: "IN_REVIEW",
    Blocked: "BLOCKED",
    Completed: "COMPLETED",
    Cancelled: "CANCELLED",
  },
  TaskPriority: {
    Low: "LOW",
    Medium: "MEDIUM",
    High: "HIGH",
    Critical: "CRITICAL",
  },
}));

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders board header", async () => {
    render(<KanbanBoard projectId={1} projectRef="proj_abc" />);

    await waitFor(() => {
      expect(screen.getByText("Board")).toBeInTheDocument();
    });
  });

  it("renders workflow columns", async () => {
    render(
      <KanbanBoard
        projectId={1}
        projectRef="proj_abc"
        workflowTemplate="startup-fast"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  it("renders tasks in correct columns", async () => {
    render(<KanbanBoard projectId={1} projectRef="proj_abc" />);

    await waitFor(() => {
      expect(screen.getByText("Task in Backlog")).toBeInTheDocument();
      expect(screen.getByText("Task in Progress")).toBeInTheDocument();
      expect(screen.getByText("Task Completed")).toBeInTheDocument();
    });
  });

  it("renders Create Task button when onTaskCreate provided", async () => {
    const handleCreate = vi.fn();
    render(
      <KanbanBoard
        projectId={1}
        projectRef="proj_abc"
        onTaskCreate={handleCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Create Task")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    render(<KanbanBoard projectId={1} projectRef="proj_abc" />);
    // Loading spinner should be visible briefly
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows empty state when no projectRef provided", async () => {
    render(<KanbanBoard projectId={1} />);

    await waitFor(() => {
      // Should not show loading state, just empty columns
      expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
    });
  });
});
