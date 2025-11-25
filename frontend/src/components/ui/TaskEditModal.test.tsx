import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TaskEditModal from "./TaskEditModal";
import type { Task } from "../../api";

vi.mock("../../api", () => ({
  api: {
    tasks: {
      updateTask: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
    repositories: {
      listRepositories: vi.fn(),
    },
  },
}));

import { api } from "../../api";

const mockTask: Task = {
  id: 1,
  projectId: 1,
  title: "Test Task",
  description: "Test description",
  status: "backlog",
  epicId: 1,
  repoName: "test-repo",
  requiresApproval: true,
  estimatedDuration: 60,
  progressPercentage: 0,
  createdByUserId: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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

const mockRepositories = [
  {
    id: 1,
    projectId: 1,
    name: "test-repo",
    path: "/path/to/repo",
    status: "ready" as const,
  },
  {
    id: 2,
    projectId: 1,
    name: "other-repo",
    path: "/path/to/other",
    status: "ready" as const,
  },
];

describe("TaskEditModal", () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();
  const projectId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      success: true,
      data: mockEpics,
    });
    vi.mocked(api.repositories.listRepositories).mockResolvedValue({
      success: true,
      data: mockRepositories,
    });
  });

  function renderModal(task: Task = mockTask) {
    return render(
      <TaskEditModal
        task={task}
        projectId={projectId}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />,
    );
  }

  it("renders the modal with pre-populated form fields", async () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Edit Task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveValue("Test Task");
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      "Test description",
    );
    expect(screen.getByLabelText(/Status/)).toHaveValue("backlog");
    expect(screen.getByLabelText(/Estimated Duration/)).toHaveValue(60);
    expect(screen.getByLabelText(/Requires approval/)).toBeChecked();

    await waitFor(() => {
      expect(api.epics.listEpics).toHaveBeenCalledWith({ id: projectId });
      expect(api.repositories.listRepositories).toHaveBeenCalledWith({
        id: projectId,
      });
    });
  });

  it("loads and displays epics in dropdown", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Epic 1")).toBeInTheDocument();
      expect(screen.getByText("Epic 2")).toBeInTheDocument();
    });

    expect(screen.getByText("No Epic")).toBeInTheDocument();
  });

  it("loads and displays repositories in dropdown", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("test-repo")).toBeInTheDocument();
      expect(screen.getByText("other-repo")).toBeInTheDocument();
    });

    expect(screen.getByText("No Repository")).toBeInTheDocument();
  });

  it("pre-selects epic from task data", async () => {
    renderModal();

    await waitFor(() => {
      const epicSelect = screen.getByLabelText(/Epic/) as HTMLSelectElement;
      expect(epicSelect.value).toBe("1");
    });
  });

  it("pre-selects repository from task data", async () => {
    renderModal();

    await waitFor(() => {
      const repoSelect = screen.getByLabelText(
        /Repository/,
      ) as HTMLSelectElement;
      expect(repoSelect.value).toBe("test-repo");
    });
  });

  it("calls onClose when clicking backdrop", () => {
    renderModal();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking cancel button", () => {
    renderModal();

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables submit button when title is empty", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "" },
    });

    const submitButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(submitButton).toBeDisabled();
  });

  it("submits form and calls callbacks on success", async () => {
    vi.mocked(api.tasks.updateTask).mockResolvedValue({
      success: true,
      data: { ...mockTask, title: "Updated Task" },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Updated Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.tasks.updateTask).toHaveBeenCalledWith({
        id: 1,
        updateTaskRequest: {
          title: "Updated Task",
          description: "Test description",
          epicId: 1,
          status: "backlog",
          repoName: "test-repo",
          requiresApproval: true,
          estimatedDuration: 60,
        },
      });
    });

    expect(mockOnUpdated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("updates status correctly", async () => {
    vi.mocked(api.tasks.updateTask).mockResolvedValue({
      success: true,
      data: { ...mockTask, status: "in_progress" },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText(/Status/), {
      target: { value: "in_progress" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.tasks.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateTaskRequest: expect.objectContaining({
            status: "in_progress",
          }),
        }),
      );
    });
  });

  it("toggles requires approval checkbox", async () => {
    vi.mocked(api.tasks.updateTask).mockResolvedValue({
      success: true,
      data: { ...mockTask, requiresApproval: false },
    });

    renderModal();

    fireEvent.click(screen.getByLabelText(/Requires approval/));
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.tasks.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateTaskRequest: expect.objectContaining({
            requiresApproval: false,
          }),
        }),
      );
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(api.tasks.updateTask).mockRejectedValue(
      new Error("Network error"),
    );

    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnUpdated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("handles task without optional fields", async () => {
    const taskWithoutOptionals: Task = {
      id: 2,
      projectId: 1,
      title: "Minimal Task",
      status: "backlog",
      requiresApproval: false,
      progressPercentage: 0,
      createdByUserId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    renderModal(taskWithoutOptionals);

    expect(screen.getByLabelText(/Title/)).toHaveValue("Minimal Task");
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByLabelText(/Estimated Duration/)).toHaveValue(null);
    expect(screen.getByLabelText(/Requires approval/)).not.toBeChecked();
  });

  it("clears epic when 'No Epic' is selected", async () => {
    vi.mocked(api.tasks.updateTask).mockResolvedValue({
      success: true,
      data: { ...mockTask, epicId: undefined },
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Epic 1")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Epic/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.tasks.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateTaskRequest: expect.objectContaining({
            epicId: undefined,
          }),
        }),
      );
    });
  });

  it("handles data fetch failure gracefully", async () => {
    vi.mocked(api.epics.listEpics).mockRejectedValue(new Error("Failed"));
    vi.mocked(api.repositories.listRepositories).mockRejectedValue(
      new Error("Failed"),
    );

    renderModal();

    expect(
      screen.getByRole("heading", { name: "Edit Task" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No Epic")).toBeInTheDocument();
      expect(screen.getByText("No Repository")).toBeInTheDocument();
    });
  });
});
