import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceSetup } from "../WorkspaceSetup";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
  homeDir: vi.fn(() => Promise.resolve("/Users/testuser")),
}));

const { open } = await import("@tauri-apps/plugin-dialog");
const { exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

describe("WorkspaceSetup", () => {
  const mockOnConfigured = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mocks
    vi.mocked(exists).mockResolvedValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
  });

  it("should not render when isOpen is false", () => {
    render(
      <WorkspaceSetup
        isOpen={false}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText("Configure Workspace")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Configure Workspace")).toBeInTheDocument();
    });
  });

  it("should show loading state initially", () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should load default workspace path", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        "/Users/you/SpecFlux"
      ) as HTMLInputElement;
      expect(input.value).toBe("/Users/testuser/SpecFlux");
    });
  });

  it("should allow user to browse for workspace directory", async () => {
    vi.mocked(open).mockResolvedValue("/custom/workspace");

    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Browse")).toBeInTheDocument();
    });

    const browseButton = screen.getByText("Browse");
    fireEvent.click(browseButton);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        "/Users/you/SpecFlux"
      ) as HTMLInputElement;
      expect(input.value).toBe("/custom/workspace");
    });
  });

  it("should allow user to type custom path", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("/Users/you/SpecFlux")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(
      "/Users/you/SpecFlux"
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "/my/custom/path" } });

    expect(input.value).toBe("/my/custom/path");
  });

  it("should save workspace configuration", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Get Started");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mkdir).toHaveBeenCalled();
      expect(writeTextFile).toHaveBeenCalled();
      expect(mockOnConfigured).toHaveBeenCalledWith("/Users/testuser/SpecFlux");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("should disable save button if workspace path is empty", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(
      "/Users/you/SpecFlux"
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const saveButton = screen.getByText("Get Started");
    expect(saveButton).toBeDisabled();
  });

  it("should show error on save failure", async () => {
    vi.mocked(writeTextFile).mockRejectedValue(new Error("Write failed"));

    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Get Started");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to save workspace configuration")).toBeInTheDocument();
    });
  });

  it("should show cancel button when not first time", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
        isFirstTime={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });
  });

  it("should call onClose when cancel is clicked", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
        isFirstTime={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should store workspace path in localStorage", async () => {
    render(
      <WorkspaceSetup
        isOpen={true}
        onConfigured={mockOnConfigured}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Get Started");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(localStorage.getItem("specflux:workspacePath")).toBe(
        "/Users/testuser/SpecFlux"
      );
    });
  });
});
