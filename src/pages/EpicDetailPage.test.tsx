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
    epics: {
      getEpic: vi.fn(),
      listEpicTasks: vi.fn(),
      listEpics: vi.fn(),
      listEpicAcceptanceCriteria: vi.fn(),
      updateEpic: vi.fn(),
      deleteEpic: vi.fn(),
    },
    releases: {
      listReleases: vi.fn(),
    },
    prds: {
      listPrds: vi.fn(),
    },
    tasks: {
      createTask: vi.fn(),
    },
  },
  EpicStatus: {
    Planning: "PLANNING",
    InProgress: "IN_PROGRESS",
    Completed: "COMPLETED",
    OnHold: "ON_HOLD",
  },
  getApiErrorMessage: vi.fn((err: Error) => err.message),
}));

// Mock the ProjectContext - use stable function reference
const mockGetProjectRef = vi.fn(() => "proj_test123");
vi.mock("../contexts", () => ({
  useProject: () => ({
    getProjectRef: mockGetProjectRef,
    currentProject: { id: "proj_test123", name: "Test Project" },
  }),
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

// Mock the TerminalContext
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
import EpicDetailPage from "./EpicDetailPage";
import { api, EpicStatus } from "../api";

// Mock epic data
const mockEpic = {
  id: "epic_123",
  displayKey: "EPIC-1",
  title: "Test Epic",
  description: "Test epic description",
  projectId: "proj_test123",
  status: EpicStatus.InProgress,
  createdById: "user_123",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  targetDate: null,
  releaseId: null,
  prdFilePath: null,
  epicFilePath: null,
  dependsOn: [],
  taskStats: { total: 2, done: 1, inProgress: 1, backlog: 0 },
  progressPercentage: 50,
  phase: 1,
};

const mockTasks = [
  {
    id: "task_1",
    displayKey: "TASK-1",
    title: "Task 1",
    description: "Task 1 description",
    status: "IN_PROGRESS",
    priority: "HIGH",
    epicDisplayKey: "EPIC-1",
    requiresApproval: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task_2",
    displayKey: "TASK-2",
    title: "Task 2",
    description: "Task 2 description",
    status: "BACKLOG",
    priority: "MEDIUM",
    epicDisplayKey: "EPIC-1",
    requiresApproval: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockAllEpics = [
  mockEpic,
  {
    id: "epic_456",
    displayKey: "EPIC-2",
    title: "Another Epic",
    projectId: "proj_test123",
    status: "PLANNING",
    createdById: "user_123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const renderWithRouter = (epicId: string = "epic_123") => {
  return render(
    <MemoryRouter initialEntries={[`/epics/${epicId}`]}>
      <Routes>
        <Route path="/epics/:id" element={<EpicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("EpicDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default successful responses
    vi.mocked(api.epics.getEpic).mockResolvedValue(mockEpic as any);
    vi.mocked(api.epics.listEpicTasks).mockResolvedValue({
      data: mockTasks,
    } as any);
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: mockAllEpics,
    } as any);
    vi.mocked(api.epics.listEpicAcceptanceCriteria).mockResolvedValue({
      data: [],
    } as any);
    vi.mocked(api.releases.listReleases).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.prds.listPrds).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.epics.updateEpic).mockResolvedValue(mockEpic as any);
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("Loading State", () => {
    it("shows loading spinner while fetching epic data", () => {
      // Set up mocks to return promises that don't resolve
      vi.mocked(api.epics.getEpic).mockImplementation(
        () => new Promise(() => {}),
      );
      vi.mocked(api.epics.listEpicTasks).mockImplementation(
        () => new Promise(() => {}),
      );
      vi.mocked(api.epics.listEpics).mockImplementation(
        () => new Promise(() => {}),
      );
      vi.mocked(api.epics.listEpicAcceptanceCriteria).mockImplementation(
        () => new Promise(() => {}),
      );
      vi.mocked(api.releases.listReleases).mockImplementation(
        () => new Promise(() => {}),
      );

      renderWithRouter();

      // Check for the loading spinner
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error message when epic fails to load", async () => {
      vi.mocked(api.epics.getEpic).mockRejectedValue(
        new Error("Epic not found"),
      );

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Error loading epic")).toBeInTheDocument();
        expect(screen.getByText("Epic not found")).toBeInTheDocument();
      });
    });

    it("shows Try Again button on error", async () => {
      vi.mocked(api.epics.getEpic).mockRejectedValue(
        new Error("Network error"),
      );

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });
    });

    it("retries fetching when Try Again is clicked", async () => {
      vi.mocked(api.epics.getEpic)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue(mockEpic as any);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(api.epics.getEpic).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Successful Load", () => {
    it("renders epic details when data loads successfully", async () => {
      renderWithRouter();

      // Wait for title to appear
      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
      });

      // Check that the API was called with correct params
      expect(api.epics.getEpic).toHaveBeenCalledWith({
        projectRef: "proj_test123",
        epicRef: "epic_123",
      });
    });

    it("displays epic description", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test epic description")).toBeInTheDocument();
      });
    });

    it("displays epic display key", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("EPIC-1")).toBeInTheDocument();
      });
    });
  });

  describe("Tasks Section", () => {
    it("displays tasks associated with the epic", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
        expect(screen.getByText("Task 2")).toBeInTheDocument();
      });
    });

    it("fetches tasks with correct parameters", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(api.epics.listEpicTasks).toHaveBeenCalledWith({
          projectRef: "proj_test123",
          epicRef: "epic_123",
          limit: 100,
        });
      });
    });

    it("shows task display keys", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("TASK-1")).toBeInTheDocument();
        expect(screen.getByText("TASK-2")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("has back link to epics", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
      });

      // DetailPageHeader uses a button for back navigation (browser history)
      const backButton = screen.getByText("Back");
      expect(backButton).toBeInTheDocument();
      expect(backButton.tagName).toBe("BUTTON");
    });
  });

  describe("Add Task", () => {
    it("shows Add button in tasks section", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("+ Add")).toBeInTheDocument();
      });
    });
  });

  describe("Progress Display", () => {
    it("displays progress percentage when available", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
      });

      // Progress should be shown (50% from mockEpic)
      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });
    });
  });

  describe("Inline Description Editing", () => {
    it("shows Edit button in view mode", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
      });

      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("switches to edit mode when Edit is clicked", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
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
      expect(textarea).toHaveValue("Test epic description");
    });

    it("cancels editing and reverts changes when Cancel is clicked", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
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
        expect(screen.getByText("Test epic description")).toBeInTheDocument();
      });
    });

    it("saves description when Save is clicked", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
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
        expect(api.epics.updateEpic).toHaveBeenCalledWith(
          expect.objectContaining({
            updateEpicRequest: expect.objectContaining({
              description: "Updated description",
            }),
          }),
        );
      });
    });

    it("cancels editing when Escape key is pressed", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Epic")).toBeInTheDocument();
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
