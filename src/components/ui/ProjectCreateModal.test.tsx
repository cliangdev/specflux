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

// Mock Tauri dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

// Mock Tauri path API
vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...args: string[]) => Promise.resolve(args.join("/"))),
}));

// Mock templates
vi.mock("../../templates", () => ({
  initProjectStructure: vi.fn(() => Promise.resolve()),
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
    expect(screen.getByLabelText(/Project Directory/)).toBeInTheDocument();
    expect(screen.getByText("Start PRD Workshop")).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText(/Project Directory/), {
      target: { value: "/some/path" },
    });

    const submitButton = screen.getByText("Create Project").closest("button");
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when name is filled (local path is optional)", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test Project" },
    });

    const submitButton = screen.getByText("Create Project").closest("button");
    expect(submitButton).not.toBeDisabled();
  });

  it("submits form and calls callbacks on success", async () => {
    vi.mocked(api.projects.createProject).mockResolvedValue({
      id: "proj_1",
      projectKey: "TEST",
      name: "Test Project",
      localPath: "/test/path",
      ownerId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test Project" },
    });
    fireEvent.change(screen.getByLabelText(/Project Directory/), {
      target: { value: "/test/path" },
    });
    fireEvent.click(screen.getByText("Create Project"));

    await waitFor(() => {
      expect(api.projects.createProject).toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText(/Project Directory/), {
      target: { value: "/test/path" },
    });
    fireEvent.click(screen.getByText("Create Project"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("allows selecting different PRD options", () => {
    renderModal();

    const skipOption = screen.getByLabelText(/Skip for now/);
    fireEvent.click(skipOption);

    expect(skipOption).toBeChecked();
  });

  it("disables submit button while submitting", async () => {
    vi.mocked(api.projects.createProject).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/Project Directory/), {
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
