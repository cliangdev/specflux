import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreatePrdModal } from "../CreatePrdModal";

// Mock Tauri dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

// Mock Tauri fs plugin
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  mkdir: vi.fn(),
  exists: vi.fn(),
}));

// Mock Tauri path API
vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...args: string[]) => Promise.resolve(args.join("/"))),
}));

// Mock API
vi.mock("../../../api", () => ({
  api: {
    prds: {
      createPrd: vi.fn(),
      addPrdDocument: vi.fn(),
    },
  },
  PrdDocumentType: {
    Prd: "PRD",
    Wireframe: "WIREFRAME",
    Mockup: "MOCKUP",
    Design: "DESIGN",
    Other: "OTHER",
  },
}));

import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { api } from "../../../api";

describe("CreatePrdModal", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const defaultProps = {
    projectPath: "/Users/test/project",
    projectRef: "test-project",
    onClose: mockOnClose,
    onCreated: mockOnCreated,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exists).mockResolvedValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
  });

  function renderModal(props = {}) {
    return render(<CreatePrdModal {...defaultProps} {...props} />);
  }

  it("renders the modal with title input", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Create PRD" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., User Authentication System")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    renderModal();

    expect(screen.getByPlaceholderText("Brief description of this PRD")).toBeInTheDocument();
  });

  it("renders file import section", () => {
    renderModal();

    expect(screen.getByText("Import existing document")).toBeInTheDocument();
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("No file selected")).toBeInTheDocument();
  });

  it("shows hint about drafting with Claude", () => {
    renderModal();

    expect(screen.getByText("You can also draft your PRD with Claude after creation")).toBeInTheDocument();
  });

  it("disables Create PRD button when title is empty", () => {
    renderModal();

    const createButton = screen.getByRole("button", { name: "Create PRD" });
    expect(createButton).toBeDisabled();
  });

  it("enables Create PRD button when title is entered", () => {
    renderModal();

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "Test PRD" } });

    const createButton = screen.getByRole("button", { name: "Create PRD" });
    expect(createButton).not.toBeDisabled();
  });

  it("calls onClose when clicking backdrop", () => {
    renderModal();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking Cancel button", () => {
    renderModal();

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking close (X) button", () => {
    renderModal();

    // Find the close button by its SVG path
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find(btn =>
      btn.querySelector('svg path[d*="M6 18L18 6"]')
    );
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("opens file picker when Browse is clicked", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/existing-prd.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith({
        multiple: false,
        title: "Select PRD Document",
        filters: expect.arrayContaining([
          expect.objectContaining({ name: "Markdown" }),
        ]),
      });
    });
  });

  it("displays selected filename after browse", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/my-prd-doc.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("my-prd-doc.md")).toBeInTheDocument();
    });
  });

  it("auto-fills title from filename when title is empty", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/user-authentication-system.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText("e.g., User Authentication System") as HTMLInputElement;
      expect(titleInput.value).toBe("User Authentication System");
    });
  });

  it("does not overwrite existing title when file is selected", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/some-file.md");

    renderModal();

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "My Custom Title" } });

    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe("My Custom Title");
    });
  });

  it("clears selected file when clear button is clicked", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/file.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("file.md")).toBeInTheDocument();
    });

    // Click the X button to clear file
    const clearButton = screen.getByTitle("Clear selection");
    fireEvent.click(clearButton);

    expect(screen.getByText("No file selected")).toBeInTheDocument();
  });

  it("creates PRD without file when no file selected", async () => {
    vi.mocked(api.prds.createPrd).mockResolvedValue({
      id: "prd_123",
      displayKey: "SPEC-P1",
      title: "Test PRD",
      folderPath: ".specflux/prds/test-prd",
      status: "DRAFT",
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    renderModal();

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "Test PRD" } });

    fireEvent.click(screen.getByRole("button", { name: "Create PRD" }));

    await waitFor(() => {
      expect(api.prds.createPrd).toHaveBeenCalledWith({
        projectRef: "test-project",
        createPrdRequest: {
          title: "Test PRD",
          description: undefined,
        },
      });
    });

    expect(mockOnCreated).toHaveBeenCalledWith("prd_123", false);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("creates PRD with imported file when file is selected", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/existing.md");
    vi.mocked(readTextFile).mockResolvedValue("# Existing PRD Content");
    vi.mocked(api.prds.createPrd).mockResolvedValue({
      id: "prd_456",
      displayKey: "SPEC-P2",
      title: "Imported PRD",
      folderPath: ".specflux/prds/imported-prd",
      status: "DRAFT",
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    renderModal();

    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("existing.md")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "Imported PRD" } });

    fireEvent.click(screen.getByRole("button", { name: "Create PRD" }));

    await waitFor(() => {
      expect(readTextFile).toHaveBeenCalledWith("/path/to/existing.md");
      expect(writeTextFile).toHaveBeenCalled();
      expect(api.prds.addPrdDocument).toHaveBeenCalled();
    });

    expect(mockOnCreated).toHaveBeenCalledWith("prd_456", true);
  });

  it("shows error when PRD creation fails", async () => {
    vi.mocked(api.prds.createPrd).mockRejectedValue(new Error("API Error"));

    renderModal();

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "Test PRD" } });

    fireEvent.click(screen.getByRole("button", { name: "Create PRD" }));

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("handles user cancelling file picker", async () => {
    vi.mocked(open).mockResolvedValue(null);

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(open).toHaveBeenCalled();
    });

    expect(screen.getByText("No file selected")).toBeInTheDocument();
  });

  it("includes description when provided", async () => {
    vi.mocked(api.prds.createPrd).mockResolvedValue({
      id: "prd_789",
      displayKey: "SPEC-P3",
      title: "Test PRD",
      description: "A test description",
      folderPath: ".specflux/prds/test-prd",
      status: "DRAFT",
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    renderModal();

    const titleInput = screen.getByPlaceholderText("e.g., User Authentication System");
    fireEvent.change(titleInput, { target: { value: "Test PRD" } });

    const descriptionInput = screen.getByPlaceholderText("Brief description of this PRD");
    fireEvent.change(descriptionInput, { target: { value: "A test description" } });

    fireEvent.click(screen.getByRole("button", { name: "Create PRD" }));

    await waitFor(() => {
      expect(api.prds.createPrd).toHaveBeenCalledWith({
        projectRef: "test-project",
        createPrdRequest: {
          title: "Test PRD",
          description: "A test description",
        },
      });
    });
  });
});
