import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TaskDetailPage from "./TaskDetailPage";
import { api, type Task, TaskStatus } from "../api";

// Mock the api
vi.mock("../api", () => ({
  api: {
    tasks: {
      getTask: vi.fn(),
      listTaskDependencies: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
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
}));

// Mock the Terminal component
vi.mock("../components/Terminal", () => ({
  default: ({ taskId }: { taskId: string }) => (
    <div data-testid="terminal">Terminal for task {taskId}</div>
  ),
}));

// Mock the FileChanges component
vi.mock("../components/FileChanges", () => ({
  default: () => <div data-testid="file-changes">File Changes</div>,
}));

// Mock the TerminalContext
vi.mock("../contexts/TerminalContext", () => ({
  useTerminal: () => ({
    sessions: [],
    activeSessionId: null,
    showPanel: false,
    createSession: vi.fn(),
    closeSession: vi.fn(),
    setActiveSession: vi.fn(),
    togglePanel: vi.fn(),
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    resizePanel: vi.fn(),
    panelSize: 300,
  }),
  TerminalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockTask: Task = {
  id: "task_123",
  displayKey: "TASK-1",
  title: "Test Task",
  description: "Test description",
  projectId: "proj_123",
  epicId: undefined,
  epicDisplayKey: undefined,
  status: TaskStatus.InProgress,
  priority: "MEDIUM",
  requiresApproval: false,
  createdById: "user_123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTaskWithEpic: Task = {
  ...mockTask,
  epicId: "epic_456",
  epicDisplayKey: "EPIC-1",
};

const mockEpics = [
  {
    id: "epic_456",
    displayKey: "EPIC-1",
    title: "Epic 1",
    projectId: "proj_123",
    status: "IN_PROGRESS" as const,
    createdById: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "epic_789",
    displayKey: "EPIC-2",
    title: "Epic 2",
    projectId: "proj_123",
    status: "PLANNING" as const,
    createdById: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage(taskId: string = "1") {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>
      <Routes>
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Mock the ProjectContext
vi.mock("../contexts", () => ({
  useProject: () => ({
    currentProject: { id: "proj_123", name: "Test Project" },
    getProjectRef: () => "PROJ-1",
  }),
}));

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.tasks.getTask).mockResolvedValue(mockTask);
    vi.mocked(api.tasks.listTaskDependencies).mockResolvedValue({
      data: [],
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: mockEpics,
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.updateTask).mockResolvedValue(mockTask);
  });

  it("renders task details correctly", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("TASK-1")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("navigates back when back button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    // Find and click the back button (it has an SVG arrow icon)
    const backButtons = screen.getAllByRole("button");
    const backButton = backButtons.find((btn) =>
      btn.querySelector('svg[viewBox="0 0 24 24"]'),
    );
    if (backButton) {
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    }
  });

  it("shows error state when task not found", async () => {
    vi.mocked(api.tasks.getTask).mockRejectedValue(new Error("Task not found"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error loading task")).toBeInTheDocument();
    });

    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });

  describe("Epic editing", () => {
    it("renders epic selector with 'No epic' when no epic assigned", async () => {
      renderPage();

      await waitFor(() => {
        expect(api.epics.listEpics).toHaveBeenCalledWith({
          projectRef: "PROJ-1",
        });
      });

      // Should show "No epic" button in the header
      await waitFor(() => {
        expect(screen.getByText("No epic")).toBeInTheDocument();
      });
    });

    it("displays current epic selection when task has epic", async () => {
      vi.mocked(api.tasks.getTask).mockResolvedValue(mockTaskWithEpic);

      renderPage();

      // Wait for epics to load and the selected epic to be displayed
      await waitFor(() => {
        expect(screen.getByText("EPIC-1")).toBeInTheDocument();
      });
    });

    it("calls updateTask when epic is changed", async () => {
      renderPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText("No epic")).toBeInTheDocument();
      });

      // Click to open the dropdown
      fireEvent.click(screen.getByText("No epic"));

      // Wait for dropdown to open and select Epic 2
      await waitFor(() => {
        expect(screen.getByText("Epic 2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Epic 2"));

      await waitFor(() => {
        expect(api.tasks.updateTask).toHaveBeenCalledWith({
          projectRef: "PROJ-1",
          taskRef: "task_123",
          updateTaskRequest: { epicRef: "epic_789" },
        });
      });
    });

    it("refreshes task after epic update", async () => {
      renderPage();

      // Wait for initial load
      await waitFor(() => {
        expect(api.tasks.getTask).toHaveBeenCalled();
      });

      // Clear the call count
      vi.mocked(api.tasks.getTask).mockClear();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText("No epic")).toBeInTheDocument();
      });

      // Click to open the dropdown
      fireEvent.click(screen.getByText("No epic"));

      // Wait for dropdown and select Epic 2
      await waitFor(() => {
        expect(screen.getByText("Epic 2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Epic 2"));

      // Should refresh task after update
      await waitFor(() => {
        expect(api.tasks.getTask).toHaveBeenCalled();
      });
    });
  });
});
