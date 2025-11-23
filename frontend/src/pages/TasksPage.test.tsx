import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TasksPage from "./TasksPage";
import { ProjectProvider } from "../contexts";
import type { Task, Project } from "../api";

vi.mock("../api", () => ({
  api: {
    projects: {
      listProjects: vi.fn(),
    },
    tasks: {
      listTasks: vi.fn(),
      createTask: vi.fn(),
    },
  },
}));

import { api } from "../api";

const mockProject: Project = {
  id: 1,
  projectId: "proj-1",
  name: "Test Project",
  localPath: "/test/path",
  workflowTemplate: "startup-fast",
  ownerUserId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: "Task One",
    status: "backlog",
    requiresApproval: false,
    progressPercentage: 0,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    projectId: 1,
    title: "Task Two",
    status: "in_progress",
    requiresApproval: true,
    progressPercentage: 50,
    createdByUserId: 1,
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
  });

  it("shows message when no project is selected", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("No project selected")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching tasks", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [mockProject],
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
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("No tasks")).toBeInTheDocument();
    });
  });

  it("renders tasks in a table", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: mockTasks,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Task One")).toBeInTheDocument();
      expect(screen.getByText("Task Two")).toBeInTheDocument();
    });
  });

  it("shows status badges for tasks", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: mockTasks,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("backlog")).toBeInTheDocument();
      expect(screen.getByText("in progress")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [mockProject],
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
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Create Task")).toBeInTheDocument();
    });
  });

  it("opens create task modal when clicking create button", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: [],
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
      success: true,
      data: [mockProject],
    });
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: mockTasks,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});
