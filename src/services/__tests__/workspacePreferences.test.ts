import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDefaultWorkspacePath,
  loadWorkspaceConfig,
  saveWorkspaceConfig,
  initializeWorkspace,
  isWorkspaceConfigured,
  getStoredWorkspacePath,
  storeWorkspacePath,
  clearStoredWorkspacePath,
  type WorkspaceConfig,
} from "../workspacePreferences";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
  homeDir: vi.fn(() => Promise.resolve("/Users/testuser")),
}));

const { readTextFile, writeTextFile, exists, mkdir } = await import(
  "@tauri-apps/plugin-fs"
);

describe("workspacePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("getDefaultWorkspacePath", () => {
    it("should return default workspace path", async () => {
      const path = await getDefaultWorkspacePath();
      expect(path).toBe("/Users/testuser/SpecFlux");
    });
  });

  describe("loadWorkspaceConfig", () => {
    it("should load existing config", async () => {
      const mockConfig: WorkspaceConfig = {
        workspacePath: "/Users/testuser/SpecFlux",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadWorkspaceConfig("/Users/testuser/SpecFlux");
      expect(config).toEqual(mockConfig);
    });

    it("should return null if config does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const config = await loadWorkspaceConfig("/Users/testuser/SpecFlux");
      expect(config).toBeNull();
    });

    it("should return null on read error", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockRejectedValue(new Error("Read failed"));

      const config = await loadWorkspaceConfig("/Users/testuser/SpecFlux");
      expect(config).toBeNull();
    });
  });

  describe("saveWorkspaceConfig", () => {
    it("should save config to disk", async () => {
      const config: WorkspaceConfig = {
        workspacePath: "/Users/testuser/SpecFlux",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeTextFile).mockResolvedValue(undefined);

      await saveWorkspaceConfig(config);

      expect(mkdir).toHaveBeenCalledWith(
        "/Users/testuser/SpecFlux/.specflux-workspace",
        { recursive: true }
      );
      expect(writeTextFile).toHaveBeenCalledWith(
        "/Users/testuser/SpecFlux/.specflux-workspace/config.json",
        JSON.stringify(config, null, 2)
      );
    });

    it("should throw error on save failure", async () => {
      const config: WorkspaceConfig = {
        workspacePath: "/Users/testuser/SpecFlux",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeTextFile).mockRejectedValue(new Error("Write failed"));

      await expect(saveWorkspaceConfig(config)).rejects.toThrow(
        "Failed to save workspace configuration"
      );
    });
  });

  describe("initializeWorkspace", () => {
    it("should initialize workspace with current timestamp", async () => {
      const now = "2024-01-01T00:00:00.000Z";
      vi.setSystemTime(new Date(now));

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeTextFile).mockResolvedValue(undefined);

      const config = await initializeWorkspace("/Users/testuser/SpecFlux");

      expect(config).toEqual({
        workspacePath: "/Users/testuser/SpecFlux",
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  describe("isWorkspaceConfigured", () => {
    it("should return true if config exists", async () => {
      const mockConfig: WorkspaceConfig = {
        workspacePath: "/Users/testuser/SpecFlux",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockConfig));

      const configured = await isWorkspaceConfigured("/Users/testuser/SpecFlux");
      expect(configured).toBe(true);
    });

    it("should return false if config does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const configured = await isWorkspaceConfigured("/Users/testuser/SpecFlux");
      expect(configured).toBe(false);
    });
  });

  describe("localStorage operations", () => {
    it("should store and retrieve workspace path", () => {
      const path = "/Users/testuser/SpecFlux";
      storeWorkspacePath(path);

      const stored = getStoredWorkspacePath();
      expect(stored).toBe(path);
    });

    it("should clear stored workspace path", () => {
      const path = "/Users/testuser/SpecFlux";
      storeWorkspacePath(path);
      clearStoredWorkspacePath();

      const stored = getStoredWorkspacePath();
      expect(stored).toBeNull();
    });

    it("should return null if no path is stored", () => {
      const stored = getStoredWorkspacePath();
      expect(stored).toBeNull();
    });
  });
});
