import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLocalProjectSettings,
  getLocalProjectPath,
  setLocalProjectPath,
  removeLocalProjectSettings,
  hasLocalProjectPath,
  getFullRepositoryPath,
  migrateProjectLocalPath,
  getAllConfiguredProjectIds,
} from "../localProjectSettings";

describe("localProjectSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("getLocalProjectPath", () => {
    it("should return null for unconfigured project", () => {
      const path = getLocalProjectPath("project-1");
      expect(path).toBeNull();
    });

    it("should return stored path for configured project", () => {
      setLocalProjectPath("project-1", "/Users/test/project");
      const path = getLocalProjectPath("project-1");
      expect(path).toBe("/Users/test/project");
    });
  });

  describe("setLocalProjectPath", () => {
    it("should store local path for project", () => {
      setLocalProjectPath("project-1", "/Users/test/project");

      const path = getLocalProjectPath("project-1");
      expect(path).toBe("/Users/test/project");
    });

    it("should update existing path", () => {
      setLocalProjectPath("project-1", "/old/path");
      setLocalProjectPath("project-1", "/new/path");

      const path = getLocalProjectPath("project-1");
      expect(path).toBe("/new/path");
    });

    it("should not affect other projects", () => {
      setLocalProjectPath("project-1", "/path/to/project1");
      setLocalProjectPath("project-2", "/path/to/project2");

      expect(getLocalProjectPath("project-1")).toBe("/path/to/project1");
      expect(getLocalProjectPath("project-2")).toBe("/path/to/project2");
    });

    it("should set updatedAt timestamp", () => {
      const now = new Date("2024-01-15T10:00:00.000Z");
      vi.setSystemTime(now);

      setLocalProjectPath("project-1", "/path");

      const settings = getLocalProjectSettings("project-1");
      expect(settings?.updatedAt).toBe("2024-01-15T10:00:00.000Z");
    });
  });

  describe("getLocalProjectSettings", () => {
    it("should return null for unconfigured project", () => {
      const settings = getLocalProjectSettings("project-1");
      expect(settings).toBeNull();
    });

    it("should return full settings object", () => {
      const now = new Date("2024-01-15T10:00:00.000Z");
      vi.setSystemTime(now);

      setLocalProjectPath("project-1", "/Users/test/project");

      const settings = getLocalProjectSettings("project-1");
      expect(settings).toEqual({
        localPath: "/Users/test/project",
        updatedAt: "2024-01-15T10:00:00.000Z",
      });
    });
  });

  describe("removeLocalProjectSettings", () => {
    it("should remove project settings", () => {
      setLocalProjectPath("project-1", "/path");
      removeLocalProjectSettings("project-1");

      expect(getLocalProjectPath("project-1")).toBeNull();
    });

    it("should not affect other projects", () => {
      setLocalProjectPath("project-1", "/path1");
      setLocalProjectPath("project-2", "/path2");

      removeLocalProjectSettings("project-1");

      expect(getLocalProjectPath("project-1")).toBeNull();
      expect(getLocalProjectPath("project-2")).toBe("/path2");
    });

    it("should handle removing non-existent project", () => {
      // Should not throw
      expect(() => removeLocalProjectSettings("non-existent")).not.toThrow();
    });
  });

  describe("hasLocalProjectPath", () => {
    it("should return false for unconfigured project", () => {
      expect(hasLocalProjectPath("project-1")).toBe(false);
    });

    it("should return true for configured project", () => {
      setLocalProjectPath("project-1", "/path");
      expect(hasLocalProjectPath("project-1")).toBe(true);
    });
  });

  describe("getFullRepositoryPath", () => {
    it("should return null if project has no local path", () => {
      const fullPath = getFullRepositoryPath("project-1", "repo-name");
      expect(fullPath).toBeNull();
    });

    it("should combine local path and repo path", () => {
      setLocalProjectPath("project-1", "/Users/test/project");
      const fullPath = getFullRepositoryPath("project-1", "my-repo");
      expect(fullPath).toBe("/Users/test/project/my-repo");
    });

    it("should normalize trailing slashes in local path", () => {
      setLocalProjectPath("project-1", "/Users/test/project/");
      const fullPath = getFullRepositoryPath("project-1", "my-repo");
      expect(fullPath).toBe("/Users/test/project/my-repo");
    });

    it("should normalize leading slashes in repo path", () => {
      setLocalProjectPath("project-1", "/Users/test/project");
      const fullPath = getFullRepositoryPath("project-1", "/my-repo");
      expect(fullPath).toBe("/Users/test/project/my-repo");
    });

    it("should handle nested repo paths", () => {
      setLocalProjectPath("project-1", "/Users/test/project");
      const fullPath = getFullRepositoryPath("project-1", "repos/backend");
      expect(fullPath).toBe("/Users/test/project/repos/backend");
    });
  });

  describe("migrateProjectLocalPath", () => {
    it("should migrate backend path to local storage", () => {
      migrateProjectLocalPath("project-1", "/backend/path");
      expect(getLocalProjectPath("project-1")).toBe("/backend/path");
    });

    it("should not overwrite existing local setting", () => {
      setLocalProjectPath("project-1", "/local/path");
      migrateProjectLocalPath("project-1", "/backend/path");

      expect(getLocalProjectPath("project-1")).toBe("/local/path");
    });

    it("should not migrate empty backend path", () => {
      migrateProjectLocalPath("project-1", "");
      expect(getLocalProjectPath("project-1")).toBeNull();
    });
  });

  describe("getAllConfiguredProjectIds", () => {
    it("should return empty array when no projects configured", () => {
      expect(getAllConfiguredProjectIds()).toEqual([]);
    });

    it("should return all configured project IDs", () => {
      setLocalProjectPath("project-1", "/path1");
      setLocalProjectPath("project-2", "/path2");
      setLocalProjectPath("project-3", "/path3");

      const ids = getAllConfiguredProjectIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain("project-1");
      expect(ids).toContain("project-2");
      expect(ids).toContain("project-3");
    });
  });

  describe("error handling", () => {
    it("should handle corrupted localStorage data", () => {
      localStorage.setItem("specflux:projectSettings", "not-valid-json");

      // Should not throw and return null
      const path = getLocalProjectPath("project-1");
      expect(path).toBeNull();
    });

    it("should handle localStorage write errors gracefully", () => {
      // Mock console.error to verify it's called
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Spy on localStorage.setItem and make it throw
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceeded");
        });

      // Should not throw
      expect(() => setLocalProjectPath("project-1", "/path")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save project settings:",
        expect.any(Error)
      );

      // Restore
      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
