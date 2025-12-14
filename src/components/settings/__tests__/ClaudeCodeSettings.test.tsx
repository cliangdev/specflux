import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeCodeSettings } from "../ClaudeCodeSettings";

// Mock Tauri file system APIs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join("/"))),
}));

// Mock ProjectContext
vi.mock("../../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { useProject } from "../../../contexts/ProjectContext";

describe("ClaudeCodeSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows message when no project is selected", () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: null,
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    render(<ClaudeCodeSettings />);
    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows warning when project has no local path", () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        ownerId: "user_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        // localPath is undefined
      },
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    render(<ClaudeCodeSettings />);
    expect(screen.getByText("Local path required")).toBeInTheDocument();
  });

  it("loads settings from settings.local.json", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        ownerId: "user_1",
        localPath: "/path/to/project",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockImplementation(async (path: string) => {
      if (path.includes("settings.local.json")) {
        return JSON.stringify({
          permissions: {
            allow: ["Bash(npm:*)", "Bash(git:*)"],
            deny: ["Read(./.env)"],
          },
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: false,
          },
        });
      }
      return JSON.stringify({ permissions: { allow: [], deny: [] } });
    });

    render(<ClaudeCodeSettings />);

    await waitFor(() => {
      expect(screen.getByText("Bash(npm:*)")).toBeInTheDocument();
      expect(screen.getByText("Bash(git:*)")).toBeInTheDocument();
      expect(screen.getByText("Read(./.env)")).toBeInTheDocument();
    });
  });

  it("merges permissions from both local and project settings", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        ownerId: "user_1",
        localPath: "/path/to/project",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockImplementation(async (path: string) => {
      if (path.includes("settings.local.json")) {
        return JSON.stringify({
          permissions: {
            allow: ["Bash(npm:*)"],
            deny: [],
          },
        });
      }
      // settings.json has different commands
      return JSON.stringify({
        permissions: {
          allow: ["Bash(git:*)"],
          deny: [],
        },
      });
    });

    render(<ClaudeCodeSettings />);

    await waitFor(() => {
      // Both should be merged
      expect(screen.getByText("Bash(npm:*)")).toBeInTheDocument();
      expect(screen.getByText("Bash(git:*)")).toBeInTheDocument();
    });
  });

  it("saves settings to settings.local.json", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        ownerId: "user_1",
        localPath: "/path/to/project",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    vi.mocked(exists).mockResolvedValue(false);
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    render(<ClaudeCodeSettings />);

    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(writeTextFile).toHaveBeenCalled();
      // Check it saves to settings.local.json
      const [path] = vi.mocked(writeTextFile).mock.calls[0];
      expect(path).toContain("settings.local.json");
    });
  });

  it("applies quick profile and merges with existing commands", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        ownerId: "user_1",
        localPath: "/path/to/project",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      projects: [],
      loading: false,
      setCurrentProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
    });

    vi.mocked(exists).mockResolvedValue(false);

    render(<ClaudeCodeSettings />);

    await waitFor(() => {
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });

    // Click the Frontend profile button
    fireEvent.click(screen.getByText("Frontend"));

    // Should add frontend commands
    await waitFor(() => {
      expect(screen.getByText("Bash(npm:*)")).toBeInTheDocument();
    });
  });
});
