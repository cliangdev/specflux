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
    agents: {
      projectsIdAgentsGet: vi.fn(),
    },
  },
  getApiErrorMessage: vi.fn().mockImplementation(async (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  }),
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
    // Default mock for agents
    vi.mocked(api.agents.projectsIdAgentsGet).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  // Helper to fill in required fields
  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });
    fireEvent.change(screen.getByPlaceholderText("Criterion 1"), {
      target: { value: "Test criterion" },
    });
  }

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
    expect(screen.getByText(/Acceptance Criteria/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Criterion 1")).toBeInTheDocument();
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

  it("disables submit button when no criteria are filled", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });

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
    fireEvent.change(screen.getByPlaceholderText("Criterion 1"), {
      target: { value: "Test criterion" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(api.tasks.createTask).toHaveBeenCalledWith({
        id: projectId,
        createTaskRequest: {
          title: "Test Task",
          description: "Test description",
          acceptanceCriteria: ["Test criterion"],
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
    fireEvent.change(screen.getByPlaceholderText("Criterion 1"), {
      target: { value: "Test criterion" },
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
          acceptanceCriteria: ["Test criterion"],
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

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("enables submit button when title and criteria are filled", () => {
    renderModal();

    fillRequiredFields();

    const submitButton = screen.getByRole("button", { name: /Create Task/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("allows adding multiple criteria", () => {
    renderModal();

    // Initially has one criterion input
    expect(screen.getByPlaceholderText("Criterion 1")).toBeInTheDocument();

    // Click add another
    fireEvent.click(screen.getByText("+ Add another criterion"));

    // Now has two
    expect(screen.getByPlaceholderText("Criterion 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Criterion 2")).toBeInTheDocument();
  });

  it("allows removing criteria when more than one exists", () => {
    renderModal();

    // Add another criterion
    fireEvent.click(screen.getByText("+ Add another criterion"));
    expect(screen.getByPlaceholderText("Criterion 2")).toBeInTheDocument();

    // Remove button should be visible for each criterion
    const removeButtons = screen.getAllByTitle("Remove criterion");
    expect(removeButtons).toHaveLength(2);

    // Remove second criterion
    fireEvent.click(removeButtons[1]);

    // Only first criterion should remain
    expect(screen.getByPlaceholderText("Criterion 1")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Criterion 2"),
    ).not.toBeInTheDocument();
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
