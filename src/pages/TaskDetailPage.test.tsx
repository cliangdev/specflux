import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock the api module - simple pattern
vi.mock("../api", () => ({
  api: {
    tasks: {
      getTask: vi.fn(),
      listTaskDependencies: vi.fn(),
      listTaskAcceptanceCriteria: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      removeTaskDependency: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
    agents: {
      listAgents: vi.fn(),
    },
  },
  TaskStatus: {
    Backlog: "BACKLOG",
    Ready: "READY",
    InProgress: "IN_PROGRESS",
    InReview: "IN_REVIEW",
    Done: "DONE",
    Blocked: "BLOCKED",
  },
}));

// Mock Tauri plugin-shell
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

// Mock Terminal component
vi.mock("../components/Terminal", () => ({
  default: ({ taskId }: { taskId: string }) => (
    <div data-testid="terminal">Terminal for task {taskId}</div>
  ),
}));

// Mock FileChanges component
vi.mock("../components/FileChanges", () => ({
  default: () => <div data-testid="file-changes">File Changes</div>,
}));

// Mock TerminalContext
vi.mock("../contexts/TerminalContext", () => ({
  useTerminal: () => ({
    sessions: [],
    activeSessionId: null,
    activeSession: null,
    showPanel: false,
    createSession: vi.fn(),
    closeSession: vi.fn(),
    setActiveSession: vi.fn(),
    togglePanel: vi.fn(),
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    resizePanel: vi.fn(),
    panelSize: 300,
    openTerminalForContext: vi.fn(),
    getExistingSession: vi.fn(() => null),
    switchToSession: vi.fn(),
    activeTask: null,
    isRunning: false,
    pageContext: null,
    setPageContext: vi.fn(),
    suggestedCommands: [],
  }),
  TerminalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock usePageContext hook
vi.mock("../hooks/usePageContext", () => ({
  usePageContext: vi.fn(),
}));

// Mock ProjectContext - use stable function reference
const mockGetProjectRef = vi.fn(() => "PROJ-1");
vi.mock("../contexts", () => ({
  useProject: () => ({
    currentProject: { id: "proj_123", name: "Test Project" },
    getProjectRef: mockGetProjectRef,
  }),
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();

// Mock react-router-dom partially
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import after mocks
import TaskDetailPage from "./TaskDetailPage";
import { api, TaskStatus } from "../api";

// Mock data
const mockTask = {
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTaskWithEpic = {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "epic_789",
    displayKey: "EPIC-2",
    title: "Epic 2",
    projectId: "proj_123",
    status: "PLANNING" as const,
    createdById: "user_123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function renderPage(taskId: string = "task_123") {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>
      <Routes>
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default successful responses
    vi.mocked(api.tasks.getTask).mockResolvedValue(mockTask as any);
    vi.mocked(api.tasks.listTaskDependencies).mockResolvedValue({
      data: [],
    } as any);
    vi.mocked(api.tasks.listTaskAcceptanceCriteria).mockResolvedValue({
      data: [],
    } as any);
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: mockEpics,
      pagination: { hasMore: false },
    } as any);
    vi.mocked(api.tasks.updateTask).mockResolvedValue(mockTask as any);
    vi.mocked(api.agents.listAgents).mockResolvedValue({ data: [] } as any);
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("displays loading spinner initially", () => {
    // Override to never resolve
    vi.mocked(api.tasks.getTask).mockImplementation(
      () => new Promise(() => {}),
    );

    renderPage();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state when task not found", async () => {
    vi.mocked(api.tasks.getTask).mockRejectedValue(new Error("Task not found"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error loading task")).toBeInTheDocument();
      expect(screen.getByText("Task not found")).toBeInTheDocument();
    });
  });

  it("renders task details correctly", async () => {
    renderPage();

    await waitFor(() => {
      // TASK-1 appears in header
      expect(screen.getAllByText("TASK-1").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("navigates back when back button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    // DetailPageHeader uses a Link component for back navigation
    const backLink = screen.getByText("Back");
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/tasks");
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
      vi.mocked(api.tasks.getTask).mockResolvedValue(mockTaskWithEpic as any);

      renderPage();

      // Wait for epics to load and the selected epic to be displayed
      await waitFor(() => {
        expect(screen.getByText("Epic 1")).toBeInTheDocument();
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

    it("updates epic with optimistic update", async () => {
      renderPage();

      // Wait for initial load
      await waitFor(() => {
        expect(api.tasks.getTask).toHaveBeenCalled();
      });

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

      // Should call updateTask API with the new epic (Epic 2 has id epic_789)
      await waitFor(() => {
        expect(api.tasks.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            updateTaskRequest: expect.objectContaining({
              epicRef: "epic_789",
            }),
          }),
        );
      });
    });
  });

  describe("Inline Description Editing", () => {
    it("shows Edit button in view mode", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("switches to edit mode when Edit is clicked", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit"));

      // Should show Save and Cancel buttons
      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      // Should show textarea with description
      const textarea = screen.getByPlaceholderText("Enter description (supports Markdown)...");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("Test description");
    });

    it("cancels editing and reverts changes when Cancel is clicked", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      // Modify the textarea
      const textarea = screen.getByPlaceholderText("Enter description (supports Markdown)...");
      fireEvent.change(textarea, { target: { value: "Modified description" } });

      // Click Cancel
      fireEvent.click(screen.getByText("Cancel"));

      // Should exit edit mode and show original description
      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
        expect(screen.getByText("Test description")).toBeInTheDocument();
      });
    });

    it("saves description when Save is clicked", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
      });

      // Modify the textarea
      const textarea = screen.getByPlaceholderText("Enter description (supports Markdown)...");
      fireEvent.change(textarea, { target: { value: "Updated description" } });

      // Click Save
      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(api.tasks.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            updateTaskRequest: expect.objectContaining({
              description: "Updated description",
            }),
          }),
        );
      });
    });

    it("cancels editing when Escape key is pressed", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Enter description (supports Markdown)...");
      fireEvent.keyDown(textarea, { key: "Escape" });

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
      });
    });
  });
});
