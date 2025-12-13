import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AgentSettings, extractDescription } from "../AgentSettings";

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

describe("extractDescription", () => {
  it("returns first non-heading line", () => {
    const content = `# Agent Name
This is the description.
More content here.`;
    expect(extractDescription(content)).toBe("This is the description.");
  });

  it("skips multiple heading lines", () => {
    const content = `# Heading 1
## Heading 2
### Heading 3
Actual description.`;
    expect(extractDescription(content)).toBe("Actual description.");
  });

  it("returns empty string for heading-only content", () => {
    const content = `# Only Heading
## Another Heading`;
    expect(extractDescription(content)).toBe("");
  });

  it("returns empty string for empty content", () => {
    expect(extractDescription("")).toBe("");
  });

  it("handles content with no headings", () => {
    const content = `First line is description.
Second line.`;
    expect(extractDescription(content)).toBe("First line is description.");
  });
});

describe("AgentSettings", () => {
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

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  it("shows loading state initially", () => {
    mockReadDir.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithRouter(<AgentSettings />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows no project selected when currentProject is null", () => {
    mockUseProject.mockReturnValue({ currentProject: null });

    renderWithRouter(<AgentSettings />);

    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows empty state when no agents found", async () => {
    mockReadDir.mockResolvedValue([]);

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("No agents found")).toBeInTheDocument();
    });
  });

  it("shows empty state when directory doesn't exist", async () => {
    mockReadDir.mockRejectedValue(new Error("Directory not found"));

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("No agents found")).toBeInTheDocument();
    });
  });

  it("displays agents from .claude/agents/ directory", async () => {
    mockReadDir.mockResolvedValue([
      { name: "backend-dev.md", isDirectory: false },
      { name: "frontend-dev.md", isDirectory: false },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("backend-dev")) {
        return Promise.resolve("# Backend Dev\nBackend development agent.");
      }
      if (path.includes("frontend-dev")) {
        return Promise.resolve("# Frontend Dev\nFrontend development agent.");
      }
      return Promise.reject(new Error("Not found"));
    });

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("backend-dev")).toBeInTheDocument();
      expect(screen.getByText("frontend-dev")).toBeInTheDocument();
    });

    expect(screen.getByText("Backend development agent.")).toBeInTheDocument();
    expect(screen.getByText("Frontend development agent.")).toBeInTheDocument();
  });

  it("filters non-md files", async () => {
    mockReadDir.mockResolvedValue([
      { name: "agent.md", isDirectory: false },
      { name: "readme.txt", isDirectory: false },
      { name: "config.json", isDirectory: false },
    ]);
    mockReadTextFile.mockResolvedValue("# Agent\nDescription.");

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("agent")).toBeInTheDocument();
    });

    // Should only call readTextFile for .md files
    expect(mockReadTextFile).toHaveBeenCalledTimes(1);
  });

  it("continues loading other agents when one file fails", async () => {
    mockReadDir.mockResolvedValue([
      { name: "good-agent.md", isDirectory: false },
      { name: "bad-agent.md", isDirectory: false },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("good-agent")) {
        return Promise.resolve("# Good Agent\nWorks fine.");
      }
      return Promise.reject(new Error("Failed to read"));
    });

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("good-agent")).toBeInTheDocument();
    });

    // bad-agent should not appear
    expect(screen.queryByText("bad-agent")).not.toBeInTheDocument();
  });

  it("displays agent card with View Details link", async () => {
    mockReadDir.mockResolvedValue([
      { name: "test-agent.md", isDirectory: false },
    ]);
    mockReadTextFile.mockResolvedValue("# Test\nDescription.");

    renderWithRouter(<AgentSettings />);

    await waitFor(() => {
      expect(screen.getByText("test-agent")).toBeInTheDocument();
      expect(screen.getByText("View Details →")).toBeInTheDocument();
      expect(screen.getByText("Standby")).toBeInTheDocument();
    });
  });
});
