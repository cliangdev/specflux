import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilePreview } from "../FilePreview";

// Mock Tauri plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
}));

// Mock ProjectContext
vi.mock("../../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

// Mock ThemeContext
vi.mock("../../../contexts", () => ({
  useTheme: () => ({ theme: "light" }),
}));

import { readTextFile } from "@tauri-apps/plugin-fs";
import { useProject } from "../../../contexts/ProjectContext";

const mockReadTextFile = readTextFile as ReturnType<typeof vi.fn>;
const mockUseProject = useProject as ReturnType<typeof vi.fn>;

describe("FilePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProject.mockReturnValue({
      currentProject: {
        id: 1,
        name: "Test Project",
        localPath: "/home/user/projects/test",
      },
    });
  });

  it("shows loading state initially", () => {
    mockReadTextFile.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<FilePreview filePath="README.md" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays file path in header", async () => {
    mockReadTextFile.mockResolvedValue("# Hello World");

    render(<FilePreview filePath="docs/README.md" />);

    await waitFor(() => {
      expect(screen.getByText("docs/README.md")).toBeInTheDocument();
    });
  });

  it("renders markdown files with formatting", async () => {
    mockReadTextFile.mockResolvedValue("# Hello World\n\nThis is a test.");

    render(<FilePreview filePath="README.md" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Hello World",
      );
    });
    expect(screen.getByText("This is a test.")).toBeInTheDocument();
  });

  it("renders non-markdown files as plain text", async () => {
    mockReadTextFile.mockResolvedValue("const x = 1;\nconsole.log(x);");

    render(<FilePreview filePath="index.ts" />);

    await waitFor(() => {
      expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    });
  });

  it("shows error state when file fails to load", async () => {
    mockReadTextFile.mockRejectedValue(new Error("File not found"));

    render(<FilePreview filePath="missing.md" />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load file content"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("constructs correct file path with .specflux directory", async () => {
    mockReadTextFile.mockResolvedValue("content");

    render(<FilePreview filePath="specs/api.md" />);

    await waitFor(() => {
      expect(mockReadTextFile).toHaveBeenCalledWith(
        "/home/user/projects/test/.specflux/specs/api.md",
      );
    });
  });

  it("does not load file when no project is selected", () => {
    mockUseProject.mockReturnValue({ currentProject: null });
    mockReadTextFile.mockResolvedValue("content");

    render(<FilePreview filePath="README.md" />);

    expect(mockReadTextFile).not.toHaveBeenCalled();
  });

  it("reloads file when filePath changes", async () => {
    mockReadTextFile.mockResolvedValue("content 1");

    const { rerender } = render(<FilePreview filePath="file1.md" />);

    await waitFor(() => {
      expect(mockReadTextFile).toHaveBeenCalledWith(
        "/home/user/projects/test/.specflux/file1.md",
      );
    });

    mockReadTextFile.mockResolvedValue("content 2");
    rerender(<FilePreview filePath="file2.md" />);

    await waitFor(() => {
      expect(mockReadTextFile).toHaveBeenCalledWith(
        "/home/user/projects/test/.specflux/file2.md",
      );
    });
  });
});
