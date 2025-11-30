import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TaskCreateModal from "./TaskCreateModal";

vi.mock("../../api", () => ({
  api: {
    tasks: {
      createTask: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
  },
}));

import { api } from "../../api";

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

describe("TaskCreateModal", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const projectId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for listEpics
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      success: true,
      data: mockEpics,
    });
  });

  function renderModal(defaultEpicId?: number) {
    return render(
      <TaskCreateModal
        projectId={projectId}
        defaultEpicId={defaultEpicId}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );
  }

  it("renders the modal with form fields", async () => {
    renderModal();

    // Modal header text
    expect(
      screen.getByRole("heading", { name: "Create Task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Epic/)).toBeInTheDocument();

    // Wait for epics to load
    await waitFor(() => {
      expect(api.epics.listEpics).toHaveBeenCalledWith({ id: projectId });
    });
  });

  it("loads and displays epics in dropdown", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Epic 1")).toBeInTheDocument();
      expect(screen.getByText("Epic 2")).toBeInTheDocument();
    });

    // "No Epic" option should be present
    expect(screen.getByText("No Epic")).toBeInTheDocument();
  });

  it("pre-selects epic when defaultEpicId is provided", async () => {
    renderModal(1);

    await waitFor(() => {
      const epicSelect = screen.getByLabelText(/Epic/) as HTMLSelectElement;
      expect(epicSelect.value).toBe("1");
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

    const submitButton = screen.getByRole("button", { name: /Create Task/i });
    expect(submitButton).toBeDisabled();
  });

  it("submits form without epic and calls callbacks on success", async () => {
    vi.mocked(api.tasks.createTask).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: "Test Task",
        projectId: 1,
        status: "backlog",
        requiresApproval: false,
        progressPercentage: 0,
        createdByUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Test description" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(api.tasks.createTask).toHaveBeenCalledWith({
        id: projectId,
        createTaskRequest: {
          title: "Test Task",
          description: "Test description",
          epicId: undefined,
          assignedAgentId: undefined,
          executorType: undefined,
        },
      });
    });

    expect(mockOnCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits form with epic selected", async () => {
    vi.mocked(api.tasks.createTask).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: "Test Task",
        projectId: 1,
        epicId: 2,
        status: "backlog",
        requiresApproval: false,
        progressPercentage: 0,
        createdByUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    renderModal();

    // Wait for epics to load
    await waitFor(() => {
      expect(screen.getByText("Epic 2")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });
    fireEvent.change(screen.getByLabelText(/Epic/), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(api.tasks.createTask).toHaveBeenCalledWith({
        id: projectId,
        createTaskRequest: {
          title: "Test Task",
          description: undefined,
          epicId: 2,
          assignedAgentId: undefined,
          executorType: undefined,
        },
      });
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(api.tasks.createTask).mockRejectedValue(
      new Error("Network error"),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("enables submit button when title is filled", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test" },
    });

    const submitButton = screen.getByRole("button", { name: /Create Task/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("handles epic fetch failure gracefully", async () => {
    vi.mocked(api.epics.listEpics).mockRejectedValue(new Error("Failed"));

    renderModal();

    // Should still render the modal
    expect(
      screen.getByRole("heading", { name: "Create Task" }),
    ).toBeInTheDocument();

    // Epic dropdown should still exist with "No Epic" option
    await waitFor(() => {
      expect(screen.getByText("No Epic")).toBeInTheDocument();
    });
  });
});
