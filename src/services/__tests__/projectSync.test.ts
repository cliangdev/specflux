import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cloneProjectRepo,
  getGitStatus,
  autoCommitChanges,
  pushChanges,
  pullChanges,
  syncProject,
  hasGitRepo,
} from "../projectSync";
import * as workspacePreferences from "../workspacePreferences";

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts) => parts.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
}));

vi.mock("../workspacePreferences");
vi.mock("../githubConnection");

describe("projectSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspacePreferences.getStoredWorkspacePath).mockReturnValue(
      "/test/workspace"
    );
  });

  describe("getGitStatus", () => {
    it("should return null if project path does not exist", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(false);

      const status = await getGitStatus("test-project");
      expect(status).toBeNull();
    });

    it("should return git status for existing repo", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke).mockResolvedValue({
        branch: "main",
        has_changes: true,
        staged_files: ["file1.ts"],
        unstaged_files: ["file2.ts"],
        untracked_files: [],
      });

      const status = await getGitStatus("test-project");
      expect(status).toBeDefined();
      expect(status?.branch).toBe("main");
      expect(status?.has_changes).toBe(true);
      expect(status?.staged_files).toHaveLength(1);
    });

    it("should return null on error", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke).mockRejectedValue(new Error("Git error"));

      const status = await getGitStatus("test-project");
      expect(status).toBeNull();
    });
  });

  describe("cloneProjectRepo", () => {
    it("should clone repository successfully", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(invoke).mockResolvedValue(undefined);

      const result = await cloneProjectRepo(
        "test-project",
        "https://github.com/user/repo.git"
      );

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith("git_clone_repo", {
        repoUrl: "https://github.com/user/repo.git",
        targetDir: "/test/workspace/test-project",
      });
    });

    it("should fail if directory already exists", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(true);

      const result = await cloneProjectRepo(
        "test-project",
        "https://github.com/user/repo.git"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("should handle clone errors", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(invoke).mockRejectedValue(new Error("Clone failed"));

      const result = await cloneProjectRepo(
        "test-project",
        "https://github.com/user/repo.git"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Clone failed");
    });
  });

  describe("autoCommitChanges", () => {
    it("should commit changes successfully", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { exists } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke)
        .mockResolvedValueOnce({
          branch: "main",
          has_changes: true,
          staged_files: [],
          unstaged_files: ["file.ts"],
          untracked_files: [],
        })
        .mockResolvedValueOnce(undefined);

      const result = await autoCommitChanges("test-project", "test commit");

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith("git_auto_commit", {
        repoDir: "/test/workspace/test-project",
        message: "test commit",
      });
    });

    it("should skip commit if no changes", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { exists } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke).mockResolvedValue({
        branch: "main",
        has_changes: false,
        staged_files: [],
        unstaged_files: [],
        untracked_files: [],
      });

      const result = await autoCommitChanges("test-project", "test commit");

      expect(result.success).toBe(true);
      expect(result.message).toContain("No changes");
    });
  });

  describe("pushChanges", () => {
    it("should push changes successfully", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(undefined);

      const result = await pushChanges("test-project");

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith("git_push_changes", {
        repoDir: "/test/workspace/test-project",
      });
    });

    it("should handle push errors", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockRejectedValue(new Error("Push failed"));

      const result = await pushChanges("test-project");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Push failed");
    });
  });

  describe("pullChanges", () => {
    it("should pull changes successfully", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(undefined);

      const result = await pullChanges("test-project");

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith("git_pull_changes", {
        repoDir: "/test/workspace/test-project",
      });
    });

    it("should handle pull errors", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockRejectedValue(new Error("Pull failed"));

      const result = await pullChanges("test-project");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Pull failed");
    });
  });

  describe("syncProject", () => {
    it("should sync project successfully", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { exists } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke)
        // fetch
        .mockResolvedValueOnce(undefined)
        // get status
        .mockResolvedValueOnce({
          branch: "main",
          has_changes: false,
          staged_files: [],
          unstaged_files: [],
          untracked_files: [],
        })
        // pull
        .mockResolvedValueOnce(undefined)
        // push
        .mockResolvedValueOnce(undefined);

      const result = await syncProject("test-project");

      expect(result.success).toBe(true);
    });

    it("should fail if not a git repo", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(false);

      const result = await syncProject("test-project");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not a git repository");
    });
  });

  describe("hasGitRepo", () => {
    it("should return true if repo exists", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { exists } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(invoke).mockResolvedValue({
        branch: "main",
        has_changes: false,
        staged_files: [],
        unstaged_files: [],
        untracked_files: [],
      });

      const hasRepo = await hasGitRepo("test-project");
      expect(hasRepo).toBe(true);
    });

    it("should return false if repo does not exist", async () => {
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(false);

      const hasRepo = await hasGitRepo("test-project");
      expect(hasRepo).toBe(false);
    });
  });
});
