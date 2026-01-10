/**
 * Tests for Git Operations Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as gitOps from "../gitOperations";

// Mock the Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock the Tauri shell plugin for setRemoteUrl
const mockExecute = vi.fn();
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn(() => ({
      execute: mockExecute,
    })),
  },
}));

import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";

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

  describe("setRemoteUrl", () => {
    beforeEach(() => {
      mockExecute.mockClear();
      vi.mocked(Command.create).mockClear();
    });

    it("should add remote when it does not exist", async () => {
      // First call (getRemoteUrl check) returns not found
      mockExecute.mockResolvedValueOnce({ code: 1, stdout: "", stderr: "" });
      // Second call (remote add) succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

      await gitOps.setRemoteUrl(
        "/path/to/repo",
        "https://github.com/owner/repo.git"
      );

      expect(Command.create).toHaveBeenNthCalledWith(1, "git", [
        "-C",
        "/path/to/repo",
        "remote",
        "get-url",
        "origin",
      ]);
      expect(Command.create).toHaveBeenNthCalledWith(2, "git", [
        "-C",
        "/path/to/repo",
        "remote",
        "add",
        "origin",
        "https://github.com/owner/repo.git",
      ]);
    });

    it("should be idempotent when same URL (with .git variation)", async () => {
      // Remote exists with same URL (just without .git)
      mockExecute.mockResolvedValueOnce({
        code: 0,
        stdout: "https://github.com/owner/repo\n",
        stderr: "",
      });

      await gitOps.setRemoteUrl(
        "/path/to/repo",
        "https://github.com/owner/repo.git"
      );

      // Should only call get-url, not add or set-url
      expect(Command.create).toHaveBeenCalledTimes(1);
    });

    it("should throw error when remote exists with different URL", async () => {
      // Remote exists with different URL
      mockExecute.mockResolvedValueOnce({
        code: 0,
        stdout: "https://github.com/existing/project.git\n",
        stderr: "",
      });

      await expect(
        gitOps.setRemoteUrl("/path/to/repo", "https://github.com/new/repo.git")
      ).rejects.toThrow("Remote 'origin' already exists with URL");
    });

    it("should use custom remote name", async () => {
      // First call returns not found
      mockExecute.mockResolvedValueOnce({ code: 1, stdout: "", stderr: "" });
      // Second call succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

      await gitOps.setRemoteUrl(
        "/path/to/repo",
        "https://github.com/owner/repo.git",
        "upstream"
      );

      expect(Command.create).toHaveBeenNthCalledWith(1, "git", [
        "-C",
        "/path/to/repo",
        "remote",
        "get-url",
        "upstream",
      ]);
      expect(Command.create).toHaveBeenNthCalledWith(2, "git", [
        "-C",
        "/path/to/repo",
        "remote",
        "add",
        "upstream",
        "https://github.com/owner/repo.git",
      ]);
    });

    it("should throw error when add fails", async () => {
      // First call returns not found
      mockExecute.mockResolvedValueOnce({ code: 1, stdout: "", stderr: "" });
      // Second call fails
      mockExecute.mockResolvedValueOnce({
        code: 1,
        stdout: "",
        stderr: "fatal: remote origin already exists",
      });

      await expect(
        gitOps.setRemoteUrl("/path/to/repo", "https://github.com/owner/repo.git")
      ).rejects.toThrow("fatal: remote origin already exists");
    });
  });

  describe("pushWithUpstream", () => {
    beforeEach(() => {
      mockExecute.mockClear();
      vi.mocked(Command.create).mockClear();
    });

    it("should get branch name and push with upstream", async () => {
      // First call: get branch name
      mockExecute.mockResolvedValueOnce({
        code: 0,
        stdout: "main\n",
        stderr: "",
      });
      // Second call: push with upstream
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

      await gitOps.pushWithUpstream("/path/to/repo");

      expect(Command.create).toHaveBeenNthCalledWith(1, "git", [
        "-C",
        "/path/to/repo",
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ]);
      expect(Command.create).toHaveBeenNthCalledWith(2, "git", [
        "-C",
        "/path/to/repo",
        "push",
        "-u",
        "origin",
        "main",
      ]);
    });

    it("should throw error if push fails", async () => {
      // First call: get branch name
      mockExecute.mockResolvedValueOnce({
        code: 0,
        stdout: "main\n",
        stderr: "",
      });
      // Second call: push fails
      mockExecute.mockResolvedValueOnce({
        code: 1,
        stdout: "",
        stderr: "fatal: remote rejected",
      });

      await expect(gitOps.pushWithUpstream("/path/to/repo")).rejects.toThrow(
        "fatal: remote rejected"
      );
    });
  });

  describe("hasLocalCommits", () => {
    beforeEach(() => {
      mockExecute.mockClear();
      vi.mocked(Command.create).mockClear();
    });

    it("should return true when repo has commits", async () => {
      mockExecute.mockResolvedValueOnce({
        code: 0,
        stdout: "abc1234\n",
        stderr: "",
      });

      const result = await gitOps.hasLocalCommits("/path/to/repo");

      expect(result).toBe(true);
      expect(Command.create).toHaveBeenCalledWith("git", [
        "-C",
        "/path/to/repo",
        "rev-parse",
        "HEAD",
      ]);
    });

    it("should return false when repo has no commits", async () => {
      mockExecute.mockResolvedValueOnce({
        code: 128,
        stdout: "",
        stderr: "fatal: bad revision 'HEAD'",
      });

      const result = await gitOps.hasLocalCommits("/path/to/repo");

      expect(result).toBe(false);
    });
  });

  describe("syncWithRemote", () => {
    beforeEach(() => {
      mockExecute.mockClear();
      vi.mocked(Command.create).mockClear();
    });

    it("should fetch and reset when local has no commits but remote does", async () => {
      // Fetch succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
      // hasLocalCommits returns false
      mockExecute.mockResolvedValueOnce({ code: 128, stdout: "", stderr: "" });
      // Remote branch exists
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "abc123\n", stderr: "" });
      // Reset succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

      await gitOps.syncWithRemote("/path/to/repo");

      expect(Command.create).toHaveBeenCalledTimes(4);
      expect(Command.create).toHaveBeenNthCalledWith(4, "git", [
        "-C",
        "/path/to/repo",
        "reset",
        "origin/main",
      ]);
    });

    it("should skip reset when local already has commits", async () => {
      // Fetch succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
      // hasLocalCommits returns true
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "abc123\n", stderr: "" });

      await gitOps.syncWithRemote("/path/to/repo");

      expect(Command.create).toHaveBeenCalledTimes(2);
    });

    it("should handle empty remote gracefully", async () => {
      // Fetch fails (empty remote)
      mockExecute.mockResolvedValueOnce({ code: 1, stdout: "", stderr: "" });

      await gitOps.syncWithRemote("/path/to/repo");

      expect(Command.create).toHaveBeenCalledTimes(1);
    });

    it("should handle remote branch not existing", async () => {
      // Fetch succeeds
      mockExecute.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
      // hasLocalCommits returns false
      mockExecute.mockResolvedValueOnce({ code: 128, stdout: "", stderr: "" });
      // Remote branch doesn't exist
      mockExecute.mockResolvedValueOnce({ code: 128, stdout: "", stderr: "" });

      await gitOps.syncWithRemote("/path/to/repo");

      expect(Command.create).toHaveBeenCalledTimes(3);
    });
  });
});
