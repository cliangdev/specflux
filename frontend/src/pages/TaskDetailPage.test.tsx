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
    },
  },
  ControlTaskAgentRequestActionEnum: {
    Start: "start",
    Pause: "pause",
    Resume: "resume",
    Stop: "stop",
  },
  AgentStatusStatusEnum: {
    Idle: "idle",
    Running: "running",
    Paused: "paused",
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

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  projectId: 1,
  status: "in_progress",
  requiresApproval: false,
  progressPercentage: 50,
  createdByUserId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAgentStatus: AgentStatus = {
  taskId: 1,
  status: "idle",
};

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
  });

  it("renders task details correctly", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("#1")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
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

  it("shows Pause and Stop buttons when agent is running", async () => {
    vi.mocked(api.tasks.getTaskAgentStatus).mockResolvedValue({
      success: true,
      data: { ...mockAgentStatus, status: "running" },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Pause")).toBeInTheDocument();
      expect(screen.getByText("Stop")).toBeInTheDocument();
    });
  });
});
