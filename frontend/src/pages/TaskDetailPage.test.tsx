import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TaskDetailPage from "./TaskDetailPage";
import { api, type Task, type AgentStatus } from "../api";

// Mock the api
vi.mock("../api", () => ({
  api: {
    tasks: {
      getTask: vi.fn(),
      getTaskAgentStatus: vi.fn(),
      controlTaskAgent: vi.fn(),
      updateTask: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
  },
  ControlTaskAgentRequestActionEnum: {
    Start: "start",
    Stop: "stop",
  },
  AgentStatusStatusEnum: {
    Idle: "idle",
    Running: "running",
    Stopped: "stopped",
    Completed: "completed",
    Failed: "failed",
  },
}));

// Mock the Terminal component
vi.mock("../components/Terminal", () => ({
  default: ({ taskId }: { taskId: number }) => (
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
  id: 1,
  title: "Test Task",
  description: "Test description",
  projectId: 1,
  epicId: null,
  status: "in_progress",
  requiresApproval: false,
  progressPercentage: 50,
  createdByUserId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTaskWithEpic: Task = {
  ...mockTask,
  epicId: 1,
};

const mockAgentStatus: AgentStatus = {
  taskId: 1,
  status: "idle",
};

const mockEpics = [
  {
    id: 1,
    title: "Epic 1",
    projectId: 1,
    status: "active" as const,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Epic 2",
    projectId: 1,
    status: "planning" as const,
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

function renderPage(taskId: string = "1") {
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
    vi.mocked(api.tasks.getTask).mockResolvedValue({
      success: true,
      data: mockTask,
    });
    vi.mocked(api.tasks.getTaskAgentStatus).mockResolvedValue({
      success: true,
      data: mockAgentStatus,
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      success: true,
      data: mockEpics,
    });
    vi.mocked(api.tasks.updateTask).mockResolvedValue({
      success: true,
      data: mockTask,
    });
  });

  it("renders task details correctly", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("#1")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders terminal component", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("terminal")).toBeInTheDocument();
    });

    expect(screen.getByText("Terminal for task 1")).toBeInTheDocument();
  });

  it("navigates back when back button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Back to Tasks")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Back to Tasks"));
    expect(mockNavigate).toHaveBeenCalledWith("/tasks");
  });

  it("shows Start button when agent is idle", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument();
    });
  });

  it("calls controlTaskAgent when Start is clicked", async () => {
    vi.mocked(api.tasks.controlTaskAgent).mockResolvedValue({
      success: true,
      data: { ...mockAgentStatus, status: "running" },
    });

    renderPage();

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

  it("shows error state when task not found", async () => {
    vi.mocked(api.tasks.getTask).mockRejectedValue(new Error("Task not found"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error loading task")).toBeInTheDocument();
    });

    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });

  it("shows Stop button when agent is running", async () => {
    vi.mocked(api.tasks.getTaskAgentStatus).mockResolvedValue({
      success: true,
      data: { ...mockAgentStatus, status: "running" },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Stop Agent")).toBeInTheDocument();
    });
  });

  describe("Epic editing", () => {
    it("renders epic dropdown with epics loaded", async () => {
      renderPage();

      await waitFor(() => {
        expect(api.epics.listEpics).toHaveBeenCalledWith({ id: 1 });
      });

      // Check for epic options
      await waitFor(() => {
        expect(screen.getByText("No Epic")).toBeInTheDocument();
        expect(screen.getByText("Epic 1")).toBeInTheDocument();
        expect(screen.getByText("Epic 2")).toBeInTheDocument();
      });
    });

    it("displays current epic selection when task has epic", async () => {
      vi.mocked(api.tasks.getTask).mockResolvedValue({
        success: true,
        data: mockTaskWithEpic,
      });

      renderPage();

      await waitFor(() => {
        const epicSelect = screen.getByRole("combobox") as HTMLSelectElement;
        expect(epicSelect.value).toBe("1");
      });
    });

    it("calls updateTask when epic is changed", async () => {
      renderPage();

      // Wait for epics to load
      await waitFor(() => {
        expect(screen.getByText("Epic 2")).toBeInTheDocument();
      });

      const epicSelect = screen.getByRole("combobox");
      fireEvent.change(epicSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(api.tasks.updateTask).toHaveBeenCalledWith({
          id: 1,
          updateTaskRequest: { epicId: 2 },
        });
      });
    });

    it("calls updateTask with null when removing epic", async () => {
      vi.mocked(api.tasks.getTask).mockResolvedValue({
        success: true,
        data: mockTaskWithEpic,
      });

      renderPage();

      // Wait for epics to load
      await waitFor(() => {
        expect(screen.getByText("No Epic")).toBeInTheDocument();
      });

      const epicSelect = screen.getByRole("combobox");
      fireEvent.change(epicSelect, { target: { value: "" } });

      await waitFor(() => {
        expect(api.tasks.updateTask).toHaveBeenCalledWith({
          id: 1,
          updateTaskRequest: { epicId: null },
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

      // Wait for epics to load
      await waitFor(() => {
        expect(screen.getByText("Epic 2")).toBeInTheDocument();
      });

      const epicSelect = screen.getByRole("combobox");
      fireEvent.change(epicSelect, { target: { value: "2" } });

      // Should refresh task after update
      await waitFor(() => {
        expect(api.tasks.getTask).toHaveBeenCalled();
      });
    });
  });
});
