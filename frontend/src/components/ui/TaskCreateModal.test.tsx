import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TaskCreateModal from "./TaskCreateModal";

vi.mock("../../api", () => ({
  api: {
    tasks: {
      createTask: vi.fn(),
    },
  },
}));

import { api } from "../../api";

describe("TaskCreateModal", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const projectId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal() {
    return render(
      <TaskCreateModal
        projectId={projectId}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );
  }

  it("renders the modal with form fields", () => {
    renderModal();

    // Modal header text
    expect(
      screen.getByRole("heading", { name: "Create Task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Requires approval/)).toBeInTheDocument();
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

  it("submits form and calls callbacks on success", async () => {
    vi.mocked(api.tasks.createTask).mockResolvedValue({
      success: true,
      data: { id: 1, title: "Test Task" },
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
          requiresApproval: false,
        },
      });
    });

    expect(mockOnCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("includes requiresApproval when checked", async () => {
    vi.mocked(api.tasks.createTask).mockResolvedValue({
      success: true,
      data: { id: 1, title: "Test Task" },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Task" },
    });
    fireEvent.click(screen.getByLabelText(/Requires approval/));
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() => {
      expect(api.tasks.createTask).toHaveBeenCalledWith({
        id: projectId,
        createTaskRequest: {
          title: "Test Task",
          description: undefined,
          requiresApproval: true,
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
});
