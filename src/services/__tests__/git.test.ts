import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseGitHubUrl,
  validateGitUrl,
  buildGitHubSshUrl,
  getClonePath,
  parseCloneProgress,
  initializeGit,
  isGitInitialized,
  createRepository,
  addToGitignore,
  createInitialGitignore,
} from "../git";

// Mock Tauri plugins
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn(),
  },
  Child: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { Command } from "@tauri-apps/plugin-shell";
import { readTextFile, writeTextFile, mkdir } from "@tauri-apps/plugin-fs";

describe("parseGitHubUrl", () => {
  describe("HTTPS URLs", () => {
    it("parses https://github.com/owner/repo", () => {
      const result = parseGitHubUrl("https://github.com/facebook/react");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        fullUrl: "https://github.com/facebook/react",
      });
    });

    it("parses https://github.com/owner/repo.git", () => {
      const result = parseGitHubUrl("https://github.com/facebook/react.git");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        fullUrl: "https://github.com/facebook/react.git",
      });
    });

    it("handles HTTP URLs", () => {
      const result = parseGitHubUrl("http://github.com/owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        fullUrl: "http://github.com/owner/repo",
      });
    });

    it("trims whitespace", () => {
      const result = parseGitHubUrl("  https://github.com/owner/repo  ");
      expect(result?.owner).toBe("owner");
      expect(result?.repo).toBe("repo");
    });
  });

  describe("SSH URLs", () => {
    it("parses git@github.com:owner/repo.git", () => {
      const result = parseGitHubUrl("git@github.com:facebook/react.git");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        fullUrl: "git@github.com:facebook/react.git",
      });
    });

    it("parses git@github.com:owner/repo without .git", () => {
      const result = parseGitHubUrl("git@github.com:owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        fullUrl: "git@github.com:owner/repo",
      });
    });
  });

  describe("SSH alias URLs", () => {
    it("parses alias:owner/repo.git", () => {
      const result = parseGitHubUrl("github.com-work:facebook/react.git");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        fullUrl: "github.com-work:facebook/react.git",
        isSshAlias: true,
        sshAliasHost: "github.com-work",
      });
    });

    it("parses alias:owner/repo without .git", () => {
      const result = parseGitHubUrl("github.com-personal:owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        fullUrl: "github.com-personal:owner/repo",
        isSshAlias: true,
        sshAliasHost: "github.com-personal",
      });
    });

    it("parses complex alias names", () => {
      const result = parseGitHubUrl("gh-cliangdev:bryjshed/wm-core.git");
      expect(result).toEqual({
        owner: "bryjshed",
        repo: "wm-core",
        fullUrl: "gh-cliangdev:bryjshed/wm-core.git",
        isSshAlias: true,
        sshAliasHost: "gh-cliangdev",
      });
    });
  });

  describe("invalid URLs", () => {
    it("returns null for empty string", () => {
      expect(parseGitHubUrl("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(parseGitHubUrl("   ")).toBeNull();
    });

    it("returns null for non-GitHub URLs", () => {
      expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
    });

    it("returns null for incomplete URLs", () => {
      expect(parseGitHubUrl("https://github.com/owner")).toBeNull();
    });

    it("returns null for random text", () => {
      expect(parseGitHubUrl("not a url")).toBeNull();
    });
  });
});

describe("validateGitUrl", () => {
  it("returns valid for HTTPS URLs", () => {
    const result = validateGitUrl("https://github.com/owner/repo");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid for SSH URLs", () => {
    const result = validateGitUrl("git@github.com:owner/repo.git");
    expect(result.valid).toBe(true);
  });

  it("returns valid for SSH alias URLs", () => {
    const result = validateGitUrl("github.com-work:owner/repo.git");
    expect(result.valid).toBe(true);
  });

  it("returns error for empty URL", () => {
    const result = validateGitUrl("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URL is required");
  });

  it("returns error for invalid URL", () => {
    const result = validateGitUrl("not a valid url");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid URL format");
  });
});

describe("buildGitHubSshUrl", () => {
  it("builds standard SSH URL without alias", () => {
    const result = buildGitHubSshUrl("owner", "repo");
    expect(result).toBe("git@github.com:owner/repo.git");
  });

  it("builds SSH URL with alias", () => {
    const result = buildGitHubSshUrl("owner", "repo", "github.com-work");
    expect(result).toBe("github.com-work:owner/repo.git");
  });

  it("handles undefined alias", () => {
    const result = buildGitHubSshUrl("owner", "repo", undefined);
    expect(result).toBe("git@github.com:owner/repo.git");
  });
});

describe("getClonePath", () => {
  it("combines local path and repo name", () => {
    const result = getClonePath("/Users/dev/projects", "my-repo");
    expect(result).toBe("/Users/dev/projects/my-repo");
  });

  it("removes trailing slash from local path", () => {
    const result = getClonePath("/Users/dev/projects/", "my-repo");
    expect(result).toBe("/Users/dev/projects/my-repo");
  });

  it("normalizes backslashes to forward slashes", () => {
    const result = getClonePath("C:\\Users\\dev\\projects", "my-repo");
    expect(result).toBe("C:/Users/dev/projects/my-repo");
  });
});

describe("parseCloneProgress", () => {
  it("parses counting objects", () => {
    const result = parseCloneProgress("remote: Counting objects: 1234");
    expect(result).toEqual({
      phase: "counting",
      current: 1234,
      message: "Counting objects: 1234",
    });
  });

  it("parses compressing objects", () => {
    const result = parseCloneProgress("remote: Compressing objects: 50% (50/100)");
    expect(result).toEqual({
      phase: "compressing",
      percent: 50,
      current: 50,
      total: 100,
      message: "Compressing: 50%",
    });
  });

  it("parses receiving objects", () => {
    const result = parseCloneProgress("Receiving objects: 75% (750/1000), 1.50 MiB");
    expect(result).toEqual({
      phase: "receiving",
      percent: 75,
      current: 750,
      total: 1000,
      message: "Receiving: 75%",
    });
  });

  it("parses resolving deltas", () => {
    const result = parseCloneProgress("Resolving deltas: 100% (500/500), done.");
    expect(result).toEqual({
      phase: "resolving",
      percent: 100,
      current: 500,
      total: 500,
      message: "Resolving: 100%",
    });
  });

  it("returns null for unrecognized lines", () => {
    expect(parseCloneProgress("Cloning into 'repo'...")).toBeNull();
    expect(parseCloneProgress("random text")).toBeNull();
  });
});

describe("initializeGit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when git init succeeds", async () => {
    const mockExecute = vi.fn().mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await initializeGit("/path/to/project");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(Command.create).toHaveBeenCalledWith("git", ["-C", "/path/to/project", "init"]);
  });

  it("returns error when git init fails", async () => {
    const mockExecute = vi.fn().mockResolvedValue({ code: 1, stdout: "", stderr: "fatal: not a git repository" });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await initializeGit("/path/to/project");

    expect(result.success).toBe(false);
    expect(result.error).toBe("fatal: not a git repository");
  });

  it("returns error when command throws", async () => {
    vi.mocked(Command.create).mockImplementation(() => {
      throw new Error("Command failed");
    });

    const result = await initializeGit("/path/to/project");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Command failed");
  });
});

describe("isGitInitialized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when git rev-parse succeeds", async () => {
    const mockExecute = vi.fn().mockResolvedValue({ code: 0 });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await isGitInitialized("/path/to/project");

    expect(result).toBe(true);
    expect(Command.create).toHaveBeenCalledWith("git", ["-C", "/path/to/project", "rev-parse", "--git-dir"]);
  });

  it("returns false when git rev-parse fails", async () => {
    const mockExecute = vi.fn().mockResolvedValue({ code: 128 });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await isGitInitialized("/path/to/project");

    expect(result).toBe(false);
  });

  it("returns false when command throws", async () => {
    vi.mocked(Command.create).mockImplementation(() => {
      throw new Error("Command failed");
    });

    const result = await isGitInitialized("/path/to/project");

    expect(result).toBe(false);
  });
});

describe("createRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates directory and initializes git", async () => {
    vi.mocked(mkdir).mockResolvedValue(undefined);
    const mockExecute = vi.fn().mockResolvedValue({ code: 0 });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await createRepository("/path/to/project", "my-repo");

    expect(result.success).toBe(true);
    expect(result.path).toBe("/path/to/project/my-repo");
    expect(mkdir).toHaveBeenCalledWith("/path/to/project/my-repo", { recursive: true });
  });

  it("returns error when mkdir fails", async () => {
    vi.mocked(mkdir).mockRejectedValue(new Error("Permission denied"));

    const result = await createRepository("/path/to/project", "my-repo");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Permission denied");
    expect(result.path).toBe("/path/to/project/my-repo");
  });

  it("returns error when git init fails", async () => {
    vi.mocked(mkdir).mockResolvedValue(undefined);
    const mockExecute = vi.fn().mockResolvedValue({ code: 1, stderr: "Git init failed" });
    vi.mocked(Command.create).mockReturnValue({ execute: mockExecute } as unknown as ReturnType<typeof Command.create>);

    const result = await createRepository("/path/to/project", "my-repo");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Git init failed");
  });
});

describe("addToGitignore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends repo to existing .gitignore", async () => {
    vi.mocked(readTextFile).mockResolvedValue("# Existing content\nnode_modules/\n");
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    const result = await addToGitignore("/path/to/project", "my-repo");

    expect(result.success).toBe(true);
    expect(writeTextFile).toHaveBeenCalledWith(
      "/path/to/project/.gitignore",
      "# Existing content\nnode_modules/\nmy-repo/\n"
    );
  });

  it("creates .gitignore with header if it doesn't exist", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    const result = await addToGitignore("/path/to/project", "my-repo");

    expect(result.success).toBe(true);
    expect(writeTextFile).toHaveBeenCalledWith(
      "/path/to/project/.gitignore",
      expect.stringContaining("my-repo/")
    );
  });

  it("skips if repo already in .gitignore", async () => {
    vi.mocked(readTextFile).mockResolvedValue("# Repos\nmy-repo/\n");

    const result = await addToGitignore("/path/to/project", "my-repo");

    expect(result.success).toBe(true);
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it("returns error when write fails", async () => {
    vi.mocked(readTextFile).mockResolvedValue("# Content\n");
    vi.mocked(writeTextFile).mockRejectedValue(new Error("Write failed"));

    const result = await addToGitignore("/path/to/project", "my-repo");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Write failed");
  });
});

describe("createInitialGitignore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates .gitignore with repos when file doesn't exist", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    await createInitialGitignore("/path/to/project", ["repo1", "repo2"]);

    expect(writeTextFile).toHaveBeenCalledWith(
      "/path/to/project/.gitignore",
      expect.stringContaining("repo1/")
    );
    expect(writeTextFile).toHaveBeenCalledWith(
      "/path/to/project/.gitignore",
      expect.stringContaining("repo2/")
    );
  });

  it("adds repos to existing .gitignore", async () => {
    vi.mocked(readTextFile).mockResolvedValue("# Existing\n");
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    await createInitialGitignore("/path/to/project", ["repo1", "repo2"]);

    // Should call addToGitignore for each repo
    expect(writeTextFile).toHaveBeenCalledTimes(2);
  });

  it("creates empty .gitignore when no repos provided", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    await createInitialGitignore("/path/to/project");

    expect(writeTextFile).toHaveBeenCalledWith(
      "/path/to/project/.gitignore",
      expect.stringContaining("# SpecFlux Project")
    );
  });
});
