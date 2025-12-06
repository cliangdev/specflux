import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SkillSettings } from "../SkillSettings";

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

describe("SkillSettings", () => {
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
    mockReadDir.mockImplementation(() => new Promise(() => {}));

    render(<SkillSettings />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows no project selected when currentProject is null", () => {
    mockUseProject.mockReturnValue({ currentProject: null });

    render(<SkillSettings />);

    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows empty state when no skills found", async () => {
    mockReadDir.mockResolvedValue([]);

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText("No skills found")).toBeInTheDocument();
    });
  });

  it("shows empty state when directory doesn't exist", async () => {
    mockReadDir.mockRejectedValue(new Error("Directory not found"));

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText("No skills found")).toBeInTheDocument();
    });
  });

  it("displays skills from .claude/skills/ directory", async () => {
    mockReadDir.mockResolvedValue([
      { name: "typescript-patterns", isDirectory: true },
      { name: "api-design", isDirectory: true },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("typescript-patterns")) {
        return Promise.resolve(
          "# TypeScript Patterns\nBest practices for TypeScript development.",
        );
      }
      if (path.includes("api-design")) {
        return Promise.resolve("# API Design\nRESTful API design guidelines.");
      }
      return Promise.reject(new Error("Not found"));
    });

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText("typescript-patterns")).toBeInTheDocument();
      expect(screen.getByText("api-design")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Best practices for TypeScript development."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("RESTful API design guidelines."),
    ).toBeInTheDocument();
  });

  it("only processes directories, not files", async () => {
    mockReadDir.mockResolvedValue([
      { name: "valid-skill", isDirectory: true },
      { name: "readme.md", isDirectory: false },
      { name: "config.json", isDirectory: false },
    ]);
    mockReadTextFile.mockResolvedValue("# Skill\nDescription.");

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText("valid-skill")).toBeInTheDocument();
    });

    // Should only call readTextFile for directories with SKILL.md
    expect(mockReadTextFile).toHaveBeenCalledTimes(1);
    expect(mockReadTextFile).toHaveBeenCalledWith(
      "/home/user/projects/test/.claude/skills/valid-skill/SKILL.md",
    );
  });

  it("skips directories without SKILL.md", async () => {
    mockReadDir.mockResolvedValue([
      { name: "has-skill", isDirectory: true },
      { name: "no-skill", isDirectory: true },
    ]);
    mockReadTextFile.mockImplementation((path: string) => {
      if (path.includes("has-skill")) {
        return Promise.resolve("# Has Skill\nDescription.");
      }
      return Promise.reject(new Error("File not found"));
    });

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText("has-skill")).toBeInTheDocument();
    });

    // no-skill should not appear
    expect(screen.queryByText("no-skill")).not.toBeInTheDocument();
  });

  it("displays folder path for each skill", async () => {
    mockReadDir.mockResolvedValue([{ name: "test-skill", isDirectory: true }]);
    mockReadTextFile.mockResolvedValue("# Test\nDescription.");

    render(<SkillSettings />);

    await waitFor(() => {
      expect(screen.getByText(".claude/skills/test-skill")).toBeInTheDocument();
    });
  });

  it("reads from correct directory path", async () => {
    mockReadDir.mockResolvedValue([]);

    render(<SkillSettings />);

    await waitFor(() => {
      expect(mockReadDir).toHaveBeenCalledWith(
        "/home/user/projects/test/.claude/skills",
      );
    });
  });
});
