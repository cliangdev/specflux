/**
 * Tests for Git Operations Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as gitOps from "../gitOperations";

// Mock the Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

describe("gitOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cloneRepo", () => {
    it("should invoke git_clone_repo command with correct parameters", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.cloneRepo(
        "https://github.com/owner/repo.git",
        "/path/to/target",
      );

      expect(invoke).toHaveBeenCalledWith("git_clone_repo", {
        repoUrl: "https://github.com/owner/repo.git",
        targetDir: "/path/to/target",
      });
    });

    it("should throw error if clone fails", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Clone failed"));

      await expect(
        gitOps.cloneRepo("https://github.com/owner/repo.git", "/path/to/target"),
      ).rejects.toThrow("Clone failed");
    });
  });

  describe("addFiles", () => {
    it("should invoke git_add_files command with file list", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.addFiles("/path/to/repo", ["file1.txt", "file2.ts"]);

      expect(invoke).toHaveBeenCalledWith("git_add_files", {
        repoDir: "/path/to/repo",
        files: ["file1.txt", "file2.ts"],
      });
    });

    it("should handle empty file list", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.addFiles("/path/to/repo", []);

      expect(invoke).toHaveBeenCalledWith("git_add_files", {
        repoDir: "/path/to/repo",
        files: [],
      });
    });
  });

  describe("autoCommit", () => {
    it("should invoke git_auto_commit with message", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.autoCommit("/path/to/repo", "Initial commit");

      expect(invoke).toHaveBeenCalledWith("git_auto_commit", {
        repoDir: "/path/to/repo",
        message: "Initial commit",
      });
    });

    it("should handle multi-line commit messages", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const message = "feat: add feature\n\nDetailed description\n\nCo-Authored-By: Claude";
      await gitOps.autoCommit("/path/to/repo", message);

      expect(invoke).toHaveBeenCalledWith("git_auto_commit", {
        repoDir: "/path/to/repo",
        message,
      });
    });
  });

  describe("commitChanges", () => {
    it("should invoke git_commit_changes command", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.commitChanges("/path/to/repo", "Update README");

      expect(invoke).toHaveBeenCalledWith("git_commit_changes", {
        repoDir: "/path/to/repo",
        message: "Update README",
      });
    });
  });

  describe("pushChanges", () => {
    it("should invoke git_push_changes command", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.pushChanges("/path/to/repo");

      expect(invoke).toHaveBeenCalledWith("git_push_changes", {
        repoDir: "/path/to/repo",
      });
    });

    it("should throw error if push fails", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Push rejected"));

      await expect(gitOps.pushChanges("/path/to/repo")).rejects.toThrow(
        "Push rejected",
      );
    });
  });

  describe("pullChanges", () => {
    it("should invoke git_pull_changes command", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.pullChanges("/path/to/repo");

      expect(invoke).toHaveBeenCalledWith("git_pull_changes", {
        repoDir: "/path/to/repo",
      });
    });
  });

  describe("fetchRemote", () => {
    it("should invoke git_fetch_remote command", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await gitOps.fetchRemote("/path/to/repo");

      expect(invoke).toHaveBeenCalledWith("git_fetch_remote", {
        repoDir: "/path/to/repo",
      });
    });
  });

  describe("getGitStatus", () => {
    it("should invoke git_get_status and return status", async () => {
      const mockStatus = {
        branch: "main",
        has_changes: true,
        staged_files: ["file1.txt"],
        unstaged_files: ["file2.ts"],
        untracked_files: ["file3.md"],
      };

      vi.mocked(invoke).mockResolvedValue(mockStatus);

      const status = await gitOps.getGitStatus("/path/to/repo");

      expect(invoke).toHaveBeenCalledWith("git_get_status", {
        repoDir: "/path/to/repo",
      });

      expect(status).toEqual({
        branch: "main",
        hasChanges: true,
        stagedFiles: ["file1.txt"],
        unstagedFiles: ["file2.ts"],
        untrackedFiles: ["file3.md"],
      });
    });

    it("should handle clean repository status", async () => {
      const mockStatus = {
        branch: "develop",
        has_changes: false,
        staged_files: [],
        unstaged_files: [],
        untracked_files: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockStatus);

      const status = await gitOps.getGitStatus("/path/to/repo");

      expect(status).toEqual({
        branch: "develop",
        hasChanges: false,
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
      });
    });

    it("should convert snake_case response from Rust to camelCase", async () => {
      // Mock returns snake_case (from Rust)
      const mockStatus = {
        branch: "feature/test",
        has_changes: true,
        staged_files: ["test.ts"],
        unstaged_files: [],
        untracked_files: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockStatus);

      const status = await gitOps.getGitStatus("/path/to/repo");

      // Result is converted to camelCase
      expect(status).toEqual({
        branch: "feature/test",
        hasChanges: true,
        stagedFiles: ["test.ts"],
        unstagedFiles: [],
        untrackedFiles: [],
      });
    });

    it("should throw error if not a git repository", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not a git repository"));

      await expect(gitOps.getGitStatus("/path/to/nonrepo")).rejects.toThrow(
        "Not a git repository",
      );
    });
  });

  describe("parseGitHubUrl", () => {
    it("should parse HTTPS URL with .git suffix", () => {
      const result = gitOps.parseGitHubUrl(
        "https://github.com/octocat/hello-world.git",
      );
      expect(result).toEqual({ owner: "octocat", repo: "hello-world" });
    });

    it("should parse HTTPS URL without .git suffix", () => {
      const result = gitOps.parseGitHubUrl(
        "https://github.com/octocat/hello-world",
      );
      expect(result).toEqual({ owner: "octocat", repo: "hello-world" });
    });

    it("should parse SSH URL with .git suffix", () => {
      const result = gitOps.parseGitHubUrl(
        "git@github.com:octocat/hello-world.git",
      );
      expect(result).toEqual({ owner: "octocat", repo: "hello-world" });
    });

    it("should parse SSH URL without .git suffix", () => {
      const result = gitOps.parseGitHubUrl("git@github.com:octocat/hello-world");
      expect(result).toEqual({ owner: "octocat", repo: "hello-world" });
    });

    it("should handle organization names with hyphens", () => {
      const result = gitOps.parseGitHubUrl(
        "https://github.com/my-org/my-repo.git",
      );
      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("should return undefined for non-GitHub URLs", () => {
      expect(gitOps.parseGitHubUrl("https://gitlab.com/user/repo")).toBeUndefined();
      expect(gitOps.parseGitHubUrl("https://bitbucket.org/user/repo")).toBeUndefined();
      expect(gitOps.parseGitHubUrl("git@gitlab.com:user/repo.git")).toBeUndefined();
    });

    it("should be case-insensitive for github.com domain", () => {
      const result = gitOps.parseGitHubUrl(
        "https://GitHub.COM/octocat/hello-world.git",
      );
      expect(result).toEqual({ owner: "octocat", repo: "hello-world" });
    });
  });
});
