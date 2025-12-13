import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommandSettings } from "../CommandSettings";

// Mock Tauri plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
}));

// Mock ProjectContext
vi.mock("../../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { useProject } from "../../../contexts/ProjectContext";

const mockReadDir = readDir as ReturnType<typeof vi.fn>;
const mockReadTextFile = readTextFile as ReturnType<typeof vi.fn>;
const mockUseProject = useProject as ReturnType<typeof vi.fn>;

describe("CommandSettings", () => {
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

  it("shows no project selected when currentProject is null", () => {
    mockUseProject.mockReturnValue({ currentProject: null });

    render(<CommandSettings />);

    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows empty state when no commands found", async () => {
    mockReadDir.mockResolvedValue([]);

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("No commands found")).toBeInTheDocument();
    });
  });

  it("shows empty state when directory doesn't exist", async () => {
    mockReadDir.mockRejectedValue(new Error("Directory not found"));

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("No commands found")).toBeInTheDocument();
    });
  });

  it("displays commands from .claude/commands/ directory", async () => {
    mockReadDir.mockResolvedValue([
      { name: "prd.md" },
      { name: "epic.md" },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("prd.md")) {
        return Promise.resolve("Create a PRD for the given feature request.\n\nArguments: $ARGUMENTS");
      }
      if (path.includes("epic.md")) {
        return Promise.resolve("Create an epic from the PRD.\n\nThis command creates implementation epics.");
      }
      return Promise.reject(new Error("Not found"));
    });

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("/prd")).toBeInTheDocument();
      expect(screen.getByText("/epic")).toBeInTheDocument();
    });
  });

  it("only processes .md files", async () => {
    mockReadDir.mockResolvedValue([
      { name: "prd.md" },
      { name: "readme.txt" },
      { name: "config.json" },
    ]);
    mockReadTextFile.mockResolvedValue("Command content");

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("/prd")).toBeInTheDocument();
    });

    // Should only call readTextFile for .md files
    expect(mockReadTextFile).toHaveBeenCalledWith(
      "/home/user/projects/test/.claude/commands/prd.md",
    );
    // readme.txt and config.json should not be read
    expect(mockReadTextFile).not.toHaveBeenCalledWith(
      expect.stringContaining("readme.txt"),
    );
    expect(mockReadTextFile).not.toHaveBeenCalledWith(
      expect.stringContaining("config.json"),
    );
  });

  it("displays file path and size for each command", async () => {
    mockReadDir.mockResolvedValue([{ name: "test.md" }]);
    mockReadTextFile.mockResolvedValue("Test command content");

    render(<CommandSettings />);

    await waitFor(() => {
      // Text is split across nodes, so use a function matcher
      expect(
        screen.getByText((content, element) => {
          const className = element?.getAttribute?.("class") || "";
          return className.includes("text-xs") && content.includes(".claude/commands/test.md");
        }),
      ).toBeInTheDocument();
    });
  });

  it("reads from correct directory path", async () => {
    mockReadDir.mockResolvedValue([]);

    render(<CommandSettings />);

    await waitFor(() => {
      expect(mockReadDir).toHaveBeenCalledWith(
        "/home/user/projects/test/.claude/commands",
      );
    });
  });

  it("expands first command by default", async () => {
    mockReadDir.mockResolvedValue([
      { name: "first.md" },
      { name: "second.md" },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("first.md")) {
        return Promise.resolve("First command content here");
      }
      return Promise.resolve("Second command content");
    });

    render(<CommandSettings />);

    await waitFor(() => {
      // First command content should be visible (expanded)
      expect(screen.getByText("First command content here")).toBeInTheDocument();
    });
  });

  it("toggles command expansion on click", async () => {
    mockReadDir.mockResolvedValue([{ name: "test.md" }]);
    mockReadTextFile.mockResolvedValue("Expandable content");

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("/test")).toBeInTheDocument();
    });

    // Content should be visible (first item expanded by default)
    expect(screen.getByText("Expandable content")).toBeInTheDocument();

    // Click to collapse
    const commandButton = screen.getByText("/test").closest("button");
    fireEvent.click(commandButton!);

    // Content should be hidden
    await waitFor(() => {
      expect(screen.queryByText("Expandable content")).not.toBeInTheDocument();
    });

    // Click to expand again
    fireEvent.click(commandButton!);

    await waitFor(() => {
      expect(screen.getByText("Expandable content")).toBeInTheDocument();
    });
  });

  it("shows copy button when expanded", async () => {
    mockReadDir.mockResolvedValue([{ name: "test.md" }]);
    mockReadTextFile.mockResolvedValue("Content to copy");

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });
  });

  it("shows header and description", async () => {
    mockReadDir.mockResolvedValue([]);

    render(<CommandSettings />);

    await waitFor(() => {
      expect(screen.getByText("Commands")).toBeInTheDocument();
      expect(screen.getByText(/Slash commands from/)).toBeInTheDocument();
    });
  });
});
