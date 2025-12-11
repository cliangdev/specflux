import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportDocumentModal } from "../ImportDocumentModal";
import { PrdDocumentType } from "../../../api";

// Mock Tauri dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

// Mock Tauri fs plugin
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  readFile: vi.fn(),
  writeTextFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock Tauri path API
vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...args: string[]) => Promise.resolve(args.join("/"))),
}));

import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

describe("ImportDocumentModal", () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onImport: mockOnImport,
    prdFolderPath: ".specflux/prds/test-prd",
    projectPath: "/Users/test/project",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnImport.mockResolvedValue(undefined);
  });

  function renderModal(props = {}) {
    return render(<ImportDocumentModal {...defaultProps} {...props} />);
  }

  it("renders nothing when isOpen is false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal when isOpen is true", () => {
    renderModal();

    expect(screen.getByText("Import Document")).toBeInTheDocument();
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("Document Type")).toBeInTheDocument();
  });

  it("displays all document type options", () => {
    renderModal();

    expect(screen.getByText("Wireframe")).toBeInTheDocument();
    expect(screen.getByText("Mockup")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
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

  it("calls onClose when clicking close button", () => {
    renderModal();

    const closeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables Import button when no file is selected", () => {
    renderModal();

    const importButton = screen.getByText("Import").closest("button");
    expect(importButton).toBeDisabled();
  });

  it("opens file picker when Browse is clicked", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/file.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith({
        multiple: false,
        title: "Select Document",
        filters: expect.arrayContaining([
          expect.objectContaining({ name: "Documents" }),
          expect.objectContaining({ name: "Images" }),
        ]),
      });
    });
  });

  it("displays selected filename after browse", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/wireframe.html");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("wireframe.html")).toBeInTheDocument();
    });
  });

  it("auto-detects document type for HTML files", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/mockup.html");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      const wireframeRadio = screen.getByRole("radio", { name: /Wireframe/i });
      expect(wireframeRadio).toBeChecked();
    });
  });

  it("auto-detects document type for image files", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/screenshot.png");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      const mockupRadio = screen.getByRole("radio", { name: /Mockup/i });
      expect(mockupRadio).toBeChecked();
    });
  });

  it("allows changing document type", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/file.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("file.md")).toBeInTheDocument();
    });

    const designRadio = screen.getByRole("radio", { name: /Design/i });
    fireEvent.click(designRadio);

    expect(designRadio).toBeChecked();
  });

  it("shows destination path when file is selected", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/wireframe.md");

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(
        screen.getByText(/Will be copied to:.*wireframe\.md/)
      ).toBeInTheDocument();
    });
  });

  it("copies file and calls onImport on submit", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/wireframe.md");
    vi.mocked(readTextFile).mockResolvedValue("# Wireframe content");
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("wireframe.md")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Import"));

    await waitFor(() => {
      expect(readTextFile).toHaveBeenCalledWith("/path/to/wireframe.md");
      expect(writeTextFile).toHaveBeenCalled();
      expect(mockOnImport).toHaveBeenCalledWith({
        fileName: "wireframe.md",
        filePath: ".specflux/prds/test-prd/wireframe.md",
        documentType: PrdDocumentType.Wireframe,
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error when import fails", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/file.md");
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("file.md")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Import"));

    await waitFor(() => {
      expect(screen.getByText("File not found")).toBeInTheDocument();
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

    // Should still show "No file selected"
    expect(screen.getByText("No file selected")).toBeInTheDocument();
  });

  it("disables buttons while importing", async () => {
    vi.mocked(open).mockResolvedValue("/path/to/file.md");
    vi.mocked(readTextFile).mockResolvedValue("content");
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    mockOnImport.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderModal();
    fireEvent.click(screen.getByText("Browse"));

    await waitFor(() => {
      expect(screen.getByText("file.md")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Import"));

    await waitFor(() => {
      expect(screen.getByText("Cancel").closest("button")).toBeDisabled();
    });
  });
});
