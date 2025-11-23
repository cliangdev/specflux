import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProjectCreateModal from "./ProjectCreateModal";

vi.mock("../../api", () => ({
  api: {
    projects: {
      createProject: vi.fn(),
    },
  },
}));

import { api } from "../../api";

describe("ProjectCreateModal", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal() {
    return render(
      <ProjectCreateModal onClose={mockOnClose} onCreated={mockOnCreated} />,
    );
  }

  it("renders the modal with form fields", () => {
    renderModal();

    expect(screen.getByText("Create New Project")).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Local Path/)).toBeInTheDocument();
    expect(screen.getByText("Startup Fast")).toBeInTheDocument();
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

  it("disables submit button when name is empty", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Local Path/), {
      target: { value: "/some/path" },
    });

    const submitButton = screen.getByText("Create Project").closest("button");
    expect(submitButton).toBeDisabled();
  });

  it("disables submit button when local path is empty", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test Project" },
    });

    const submitButton = screen.getByText("Create Project").closest("button");
    expect(submitButton).toBeDisabled();
  });

  it("submits form and calls callbacks on success", async () => {
    vi.mocked(api.projects.createProject).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        name: "Test Project",
        projectId: "test-project",
        localPath: "/test/path",
        workflowTemplate: "startup-fast",
        ownerUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test Project" },
    });
    fireEvent.change(screen.getByLabelText(/Local Path/), {
      target: { value: "/test/path" },
    });
    fireEvent.click(screen.getByText("Create Project"));

    await waitFor(() => {
      expect(api.projects.createProject).toHaveBeenCalledWith({
        createProjectRequest: {
          name: "Test Project",
          localPath: "/test/path",
          workflowTemplate: "startup-fast",
        },
      });
    });

    expect(mockOnCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error message on API failure", async () => {
    vi.mocked(api.projects.createProject).mockRejectedValue(
      new Error("Network error"),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test Project" },
    });
    fireEvent.change(screen.getByLabelText(/Local Path/), {
      target: { value: "/test/path" },
    });
    fireEvent.click(screen.getByText("Create Project"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("allows selecting different workflow templates", () => {
    renderModal();

    const designFirst = screen.getByLabelText(/Design First/);
    fireEvent.click(designFirst);

    expect(designFirst).toBeChecked();
  });

  it("disables submit button while submitting", async () => {
    vi.mocked(api.projects.createProject).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/Local Path/), {
      target: { value: "/path" },
    });
    fireEvent.click(screen.getByText("Create Project"));

    await waitFor(() => {
      expect(
        screen.getByText("Create Project").closest("button"),
      ).toBeDisabled();
    });
  });
});
