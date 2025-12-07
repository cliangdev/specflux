import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TasksPage from "./TasksPage";
import { ProjectProvider } from "../contexts";
import type { Task, Project } from "../api";

// Mock AuthContext to simulate signed-in user
vi.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { uid: "user_123", email: "test@example.com" },
    loading: false,
    isSignedIn: true,
    signInWithEmail: vi.fn(),
    signInWithGitHub: vi.fn(),
    signOut: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue("mock-token"),
    error: null,
  }),
}));

// Mock TerminalContext
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
    openTerminalForContext: vi.fn(),
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

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    api: {
      projects: {
        listProjects: vi.fn(),
      },
      tasks: {
        listTasks: vi.fn(),
        createTask: vi.fn(),
      },
      epics: {
        listEpics: vi.fn(),
      },
      agents: {
        listAgents: vi
          .fn()
          .mockResolvedValue({ data: [], pagination: { hasMore: false } }),
      },
    },
  };
});

// Default pagination response
const mockPagination: {
  nextCursor?: string;
  prevCursor?: string;
  hasMore?: boolean;
  total?: number;
} = {
  nextCursor: undefined,
  prevCursor: undefined,
  hasMore: false,
  total: 0,
};

import { api } from "../api";

const mockProject: Project = {
  id: "proj_123",
  projectKey: "PROJ-1",
  name: "Test Project",
  ownerId: "user_123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTasks: Task[] = [
  {
    id: "task_123",
    displayKey: "TASK-1",
    projectId: "proj_123",
    title: "Task One",
    status: "BACKLOG",
    priority: "MEDIUM",
    requiresApproval: false,
    createdById: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task_456",
    displayKey: "TASK-2",
    projectId: "proj_123",
    title: "Task Two",
    status: "IN_PROGRESS",
    priority: "HIGH",
    requiresApproval: true,
    createdById: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderWithProvider() {
  return render(
    <MemoryRouter>
      <ProjectProvider>
        <TasksPage />
      </ProjectProvider>
    </MemoryRouter>,
  );
}

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for epics (empty list)
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: [],
      pagination: { hasMore: false },
    });
  });

  it("shows message when no project is selected", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [],
      pagination: { hasMore: false },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("No project selected")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching tasks", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderWithProvider();

    // Component shows a spinner during loading, check for the animate-spin class
    await waitFor(() => {
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  it("shows empty state when no tasks exist", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: [],
      pagination: mockPagination,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("No tasks")).toBeInTheDocument();
    });
  });

  it("renders tasks in a table", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: mockTasks,
      pagination: { ...mockPagination, total: 2 },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Task One")).toBeInTheDocument();
      expect(screen.getByText("Task Two")).toBeInTheDocument();
    });
  });

  it("shows status badges for tasks", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: mockTasks,
      pagination: { ...mockPagination, total: 2 },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockRejectedValue(
      new Error("Failed to fetch"),
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
  });

  it("has a create task button", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: [],
      pagination: mockPagination,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Create Task")).toBeInTheDocument();
    });
  });

  it("opens create task modal when clicking create button", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: [],
      pagination: mockPagination,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Create Task/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      // Modal is open - check for form fields
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });
  });

  it("has status filter dropdown", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [mockProject],
      pagination: { hasMore: false },
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: mockTasks,
      pagination: { ...mockPagination, total: 2 },
    });

    renderWithProvider();

    await waitFor(() => {
      // Should have 2 comboboxes - status filter and epic filter
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
