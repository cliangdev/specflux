import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanBoard } from "../KanbanBoard";
import {
  TaskStatusEnum,
  TaskAgentStatusEnum,
} from "../../../api/generated/models/Task";

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
  closestCorners: vi.fn(),
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

// Mock API
const mockTasks = [
  {
    id: 1,
    title: "Task in Backlog",
    status: TaskStatusEnum.Backlog,
    projectId: 1,
    requiresApproval: false,
    agentStatus: TaskAgentStatusEnum.Idle,
    progressPercentage: 0,
    createdByUserId: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    title: "Task in Progress",
    status: TaskStatusEnum.InProgress,
    projectId: 1,
    requiresApproval: false,
    agentStatus: TaskAgentStatusEnum.Running,
    progressPercentage: 50,
    createdByUserId: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    title: "Task Done",
    status: TaskStatusEnum.Done,
    projectId: 1,
    requiresApproval: false,
    agentStatus: TaskAgentStatusEnum.Idle,
    progressPercentage: 100,
    createdByUserId: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

vi.mock("../../../api", () => ({
  api: {
    tasks: {
      listTasks: vi.fn(() =>
        Promise.resolve({
          success: true,
          data: mockTasks,
        }),
      ),
      updateTask: vi.fn(() =>
        Promise.resolve({
          success: true,
        }),
      ),
    },
  },
}));

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders board header", async () => {
    render(<KanbanBoard projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Board")).toBeInTheDocument();
    });
  });

  it("renders workflow columns", async () => {
    render(<KanbanBoard projectId={1} workflowTemplate="startup-fast" />);

    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  it("renders tasks in correct columns", async () => {
    render(<KanbanBoard projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Task in Backlog")).toBeInTheDocument();
      expect(screen.getByText("Task in Progress")).toBeInTheDocument();
      expect(screen.getByText("Task Done")).toBeInTheDocument();
    });
  });

  it("renders New Task button when onTaskCreate provided", async () => {
    const handleCreate = vi.fn();
    render(<KanbanBoard projectId={1} onTaskCreate={handleCreate} />);

    await waitFor(() => {
      expect(screen.getByText("New Task")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    render(<KanbanBoard projectId={1} />);
    // Loading spinner should be visible briefly
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
