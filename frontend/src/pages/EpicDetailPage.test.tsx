import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import EpicDetailPage from "./EpicDetailPage";
import { api, type Epic, type Task } from "../api";

// Mock the api
vi.mock("../api", () => ({
  api: {
    epics: {
      getEpic: vi.fn(),
      getEpicTasks: vi.fn(),
      listEpics: vi.fn(),
      listEpicCriteria: vi.fn(),
    },
    tasks: {
      createTask: vi.fn(),
    },
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
    projectId: number;
    defaultEpicId?: number;
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
}));

const mockEpic: Epic = {
  id: 1,
  title: "Test Epic",
  description: "Test epic description",
  projectId: 1,
  status: "active",
  progressPercentage: 50,
  taskStats: {
    total: 4,
    done: 2,
    inProgress: 1,
  },
  createdByUserId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTasks: Task[] = [
  {
    id: 1,
    title: "Task 1",
    projectId: 1,
    epicId: 1,
    status: "done",
    requiresApproval: false,
    progressPercentage: 100,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Task 2",
    projectId: 1,
    epicId: 1,
    status: "in_progress",
    requiresApproval: false,
    progressPercentage: 50,
    createdByUserId: 1,
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

describe("EpicDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.epics.getEpic).mockResolvedValue({
      success: true,
      data: mockEpic,
    });
    vi.mocked(api.epics.getEpicTasks).mockResolvedValue({
      success: true,
      data: mockTasks,
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(api.epics.listEpicCriteria).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it("renders epic details correctly", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Epic")).toBeInTheDocument();
    });

    expect(screen.getByText("Epic #1")).toBeInTheDocument();
    expect(screen.getByText("Test epic description")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
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

    expect(mockNavigate).toHaveBeenCalledWith("/tasks/1");
  });

  it("navigates back when back button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Back to Epics")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Back to Epics"));
    expect(mockNavigate).toHaveBeenCalledWith("/epics");
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
    vi.mocked(api.epics.getEpicTasks).mockResolvedValue({
      success: true,
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
      expect(screen.getByText("Project: 1")).toBeInTheDocument();
      expect(screen.getByText("Epic: 1")).toBeInTheDocument();
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
      vi.mocked(api.epics.getEpicTasks).mockClear();

      fireEvent.click(screen.getByText("Add Task"));

      await waitFor(() => {
        expect(screen.getByTestId("task-create-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Create"));

      // Should refresh data after creation
      await waitFor(() => {
        expect(api.epics.getEpic).toHaveBeenCalled();
        expect(api.epics.getEpicTasks).toHaveBeenCalled();
      });
    });
  });

  it("shows PRD file path when available", async () => {
    vi.mocked(api.epics.getEpic).mockResolvedValue({
      success: true,
      data: { ...mockEpic, prdFilePath: "prds/feature.md" },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("prds/feature.md")).toBeInTheDocument();
    });
  });
});
