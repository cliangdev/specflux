import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import EpicDetailPage from "./EpicDetailPage";
import { api, type Epic, type Task, EpicStatus, TaskStatus } from "../api";

// Mock the api
vi.mock("../api", () => ({
  api: {
    epics: {
      getEpic: vi.fn(),
      listEpicTasks: vi.fn(),
      listEpics: vi.fn(),
      listEpicAcceptanceCriteria: vi.fn(),
    },
    releases: {
      listReleases: vi.fn(),
    },
    tasks: {
      createTask: vi.fn(),
    },
  },
  EpicStatus: {
    Planning: "PLANNING",
    InProgress: "IN_PROGRESS",
    Blocked: "BLOCKED",
    Completed: "COMPLETED",
    Cancelled: "CANCELLED",
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

// Mock EpicDetailHeader
vi.mock("../components/epics", () => ({
  EpicDetailHeader: ({ epic, onBack }: { epic: Epic; onBack: () => void }) => (
    <div>
      <span>{epic.displayKey}</span>
      <button onClick={onBack}>Back to Epics</button>
    </div>
  ),
}));

// Mock TaskCreateModal
vi.mock("../components/ui", () => ({
  ProgressBar: ({
    percent,
    showLabel,
  }: {
    percent: number;
    showLabel?: boolean;
  }) => (
    <div data-testid="progress-bar">{showLabel && <span>{percent}%</span>}</div>
  ),
  TaskCreateModal: ({
    projectId,
    defaultEpicId,
    onClose,
    onCreated,
  }: {
    projectId: string;
    defaultEpicId?: string;
    onClose: () => void;
    onCreated: () => void;
  }) => (
    <div data-testid="task-create-modal">
      <span>Project: {projectId}</span>
      <span>Epic: {defaultEpicId}</span>
      <button onClick={onClose}>Cancel</button>
      <button
        onClick={() => {
          onCreated();
          onClose();
        }}
      >
        Create
      </button>
    </div>
  ),
  AcceptanceCriteriaList: () => <div>Acceptance Criteria</div>,
}));

const mockEpic: Epic = {
  id: "epic_test123",
  displayKey: "EPIC-1",
  title: "Test Epic",
  description: "Test epic description",
  projectId: "proj_test123",
  status: EpicStatus.InProgress,
  progressPercentage: 50,
  taskStats: {
    total: 4,
    done: 2,
    inProgress: 1,
    backlog: 1,
  },
  createdById: "user_test123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTasks: Task[] = [
  {
    id: "task_test1",
    displayKey: "TASK-1",
    title: "Task 1",
    projectId: "proj_test123",
    epicId: "epic_test123",
    epicDisplayKey: "EPIC-1",
    status: TaskStatus.Completed,
    priority: "HIGH" as any,
    requiresApproval: false,
    createdById: "user_test123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task_test2",
    displayKey: "TASK-2",
    title: "Task 2",
    projectId: "proj_test123",
    epicId: "epic_test123",
    epicDisplayKey: "EPIC-1",
    status: TaskStatus.InProgress,
    priority: "MEDIUM" as any,
    requiresApproval: false,
    createdById: "user_test123",
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

function renderPage(epicId: string = "1") {
  return render(
    <MemoryRouter initialEntries={[`/epics/${epicId}`]}>
      <Routes>
        <Route path="/epics/:id" element={<EpicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Mock useProject context
vi.mock("../contexts", () => ({
  useProject: () => ({
    currentProject: { id: "proj_test123", name: "Test Project" },
    getProjectRef: () => "proj_test123",
  }),
}));

describe("EpicDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.epics.getEpic).mockResolvedValue(mockEpic);
    vi.mocked(api.epics.listEpicTasks).mockResolvedValue({
      data: mockTasks,
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: [],
    });
    vi.mocked(api.epics.listEpicAcceptanceCriteria).mockResolvedValue({
      data: [],
    });
    vi.mocked(api.releases.listReleases).mockResolvedValue({
      data: [],
    });
  });

  it("renders epic details correctly", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Epic")).toBeInTheDocument();
    });

    expect(screen.getByText("EPIC-1")).toBeInTheDocument();
    expect(screen.getByText("Test epic description")).toBeInTheDocument();
    // Status is mapped from IN_PROGRESS to "Active" in the component
  });

  it("renders progress summary", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    });

    // Check progress section elements exist (using getAllByText for labels that may appear multiple times)
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });

  it("renders tasks list", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
    });

    // Tasks section should be visible
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
  });

  it("navigates to task detail when clicking a task row", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Find and click the first task row
    fireEvent.click(screen.getByText("Task 1"));

    // The component navigates using v2Id or publicId or task.id
    expect(mockNavigate).toHaveBeenCalledWith("/tasks/task_test1");
  });

  it("navigates back when back button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Back to Epics")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Back to Epics"));
    // The component passes navigate(-1) to EpicDetailHeader's onBack prop
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows loading state", () => {
    renderPage();

    // The loading spinner should be visible before data loads
    // We can check that the epic title is not immediately visible
    expect(screen.queryByText("Test Epic")).not.toBeInTheDocument();
  });

  it("shows error state when epic fetch fails", async () => {
    vi.mocked(api.epics.getEpic).mockRejectedValue(new Error("Epic not found"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error loading epic")).toBeInTheDocument();
    });

    expect(screen.getByText("Epic not found")).toBeInTheDocument();
  });

  it("shows empty state when no tasks exist", async () => {
    vi.mocked(api.epics.listEpicTasks).mockResolvedValue({
      data: [],
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("No tasks in this epic yet."),
      ).toBeInTheDocument();
    });
  });

  describe("Add Task functionality", () => {
    it("renders Add Task button", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Add Task")).toBeInTheDocument();
      });
    });

    it("opens TaskCreateModal when Add Task is clicked", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Add Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add Task"));

      await waitFor(() => {
        expect(screen.getByTestId("task-create-modal")).toBeInTheDocument();
      });

      // Check that modal receives correct props
      expect(screen.getByText("Project: proj_test123")).toBeInTheDocument();
      expect(screen.getByText("Epic: epic_test123")).toBeInTheDocument();
    });

    it("closes modal when Cancel is clicked", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Add Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add Task"));

      await waitFor(() => {
        expect(screen.getByTestId("task-create-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(
          screen.queryByTestId("task-create-modal"),
        ).not.toBeInTheDocument();
      });
    });

    it("refreshes data after task is created", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Add Task")).toBeInTheDocument();
      });

      // Clear mocks after initial load
      vi.mocked(api.epics.getEpic).mockClear();
      vi.mocked(api.epics.listEpicTasks).mockClear();

      fireEvent.click(screen.getByText("Add Task"));

      await waitFor(() => {
        expect(screen.getByTestId("task-create-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Create"));

      // Should refresh data after creation
      await waitFor(() => {
        expect(api.epics.getEpic).toHaveBeenCalled();
        expect(api.epics.listEpicTasks).toHaveBeenCalled();
      });
    });
  });

  it("shows PRD file path when available", async () => {
    vi.mocked(api.epics.getEpic).mockResolvedValue({
      ...mockEpic,
      prdFilePath: "prds/feature.md",
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("prds/feature.md")).toBeInTheDocument();
    });
  });
});
