import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLocalProjectPath, useProjectLocalPath } from "../useLocalProjectPath";
import * as localProjectSettings from "../../services/localProjectSettings";

// Mock the localProjectSettings service
vi.mock("../../services/localProjectSettings", () => ({
  getLocalProjectPath: vi.fn(),
  setLocalProjectPath: vi.fn(),
  migrateProjectLocalPath: vi.fn(),
  getFullRepositoryPath: vi.fn(),
}));

// Create mutable state for ProjectContext mock
const mockProjectState = {
  currentProject: null as { id: string; localPath?: string } | null,
};

// Mock ProjectContext
vi.mock("../../contexts/ProjectContext", () => ({
  useProject: () => mockProjectState,
}));

describe("useLocalProjectPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockProjectState.currentProject = null;
  });

  describe("when no project is selected", () => {
    it("should return null for localPath", () => {
      mockProjectState.currentProject = null;

      const { result } = renderHook(() => useLocalProjectPath());

      expect(result.current.localPath).toBeNull();
      expect(result.current.isConfigured).toBe(false);
    });

    it("should not call getLocalProjectPath", () => {
      mockProjectState.currentProject = null;

      renderHook(() => useLocalProjectPath());

      expect(localProjectSettings.getLocalProjectPath).not.toHaveBeenCalled();
    });
  });

  describe("when project is selected", () => {
    it("should load local path from storage", async () => {
      mockProjectState.currentProject = { id: "proj-123" };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(
        "/Users/test/project"
      );

      const { result } = renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(result.current.localPath).toBe("/Users/test/project");
      });
      expect(result.current.isConfigured).toBe(true);
    });

    it("should return null when no local path is configured", async () => {
      mockProjectState.currentProject = { id: "proj-123" };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(null);

      const { result } = renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(result.current.localPath).toBeNull();
      });
      expect(result.current.isConfigured).toBe(false);
    });
  });

  describe("migration from backend", () => {
    it("should migrate localPath from backend if not in local storage", async () => {
      mockProjectState.currentProject = {
        id: "proj-123",
        localPath: "/backend/path",
      };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(null);

      renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(localProjectSettings.migrateProjectLocalPath).toHaveBeenCalledWith(
          "proj-123",
          "/backend/path"
        );
      });
    });

    it("should not migrate if local storage already has a path", async () => {
      mockProjectState.currentProject = {
        id: "proj-123",
        localPath: "/backend/path",
      };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(
        "/local/path"
      );

      renderHook(() => useLocalProjectPath());

      expect(
        localProjectSettings.migrateProjectLocalPath
      ).not.toHaveBeenCalled();
    });

    it("should use migrated path from backend", async () => {
      mockProjectState.currentProject = {
        id: "proj-123",
        localPath: "/backend/path",
      };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(null);

      const { result } = renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(result.current.localPath).toBe("/backend/path");
      });
    });
  });

  describe("setLocalPath", () => {
    it("should update local path in storage and state", async () => {
      mockProjectState.currentProject = { id: "proj-123" };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(null);

      const { result } = renderHook(() => useLocalProjectPath());

      act(() => {
        result.current.setLocalPath("/new/path");
      });

      expect(localProjectSettings.setLocalProjectPath).toHaveBeenCalledWith(
        "proj-123",
        "/new/path"
      );
      expect(result.current.localPath).toBe("/new/path");
    });

    it("should not update storage when no project is selected", async () => {
      mockProjectState.currentProject = null;

      const { result } = renderHook(() => useLocalProjectPath());

      act(() => {
        result.current.setLocalPath("/new/path");
      });

      expect(localProjectSettings.setLocalProjectPath).not.toHaveBeenCalled();
    });
  });

  describe("getRepoFullPath", () => {
    it("should return full repository path", async () => {
      mockProjectState.currentProject = { id: "proj-123" };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(
        "/Users/test/project"
      );
      vi.mocked(localProjectSettings.getFullRepositoryPath).mockReturnValue(
        "/Users/test/project/my-repo"
      );

      const { result } = renderHook(() => useLocalProjectPath());

      const fullPath = result.current.getRepoFullPath("my-repo");

      expect(localProjectSettings.getFullRepositoryPath).toHaveBeenCalledWith(
        "proj-123",
        "my-repo"
      );
      expect(fullPath).toBe("/Users/test/project/my-repo");
    });

    it("should return null when no project is selected", () => {
      mockProjectState.currentProject = null;

      const { result } = renderHook(() => useLocalProjectPath());

      const fullPath = result.current.getRepoFullPath("my-repo");

      expect(fullPath).toBeNull();
      expect(localProjectSettings.getFullRepositoryPath).not.toHaveBeenCalled();
    });
  });

  describe("project changes", () => {
    it("should reload path when project changes", async () => {
      mockProjectState.currentProject = { id: "proj-1" };
      vi.mocked(localProjectSettings.getLocalProjectPath)
        .mockReturnValueOnce("/path/project1")
        .mockReturnValueOnce("/path/project2");

      const { result, rerender } = renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(result.current.localPath).toBe("/path/project1");
      });

      // Change project
      mockProjectState.currentProject = { id: "proj-2" };
      rerender();

      await waitFor(() => {
        expect(result.current.localPath).toBe("/path/project2");
      });
    });

    it("should reset to null when project is deselected", async () => {
      mockProjectState.currentProject = { id: "proj-1" };
      vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(
        "/path/project1"
      );

      const { result, rerender } = renderHook(() => useLocalProjectPath());

      await waitFor(() => {
        expect(result.current.localPath).toBe("/path/project1");
      });

      // Deselect project
      mockProjectState.currentProject = null;
      rerender();

      await waitFor(() => {
        expect(result.current.localPath).toBeNull();
      });
    });
  });
});

describe("useProjectLocalPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should return null for null project ID", () => {
    const { result } = renderHook(() => useProjectLocalPath(null));

    expect(result.current).toBeNull();
    expect(localProjectSettings.getLocalProjectPath).not.toHaveBeenCalled();
  });

  it("should return local path for valid project ID", async () => {
    vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(
      "/Users/test/project"
    );

    const { result } = renderHook(() => useProjectLocalPath("proj-123"));

    await waitFor(() => {
      expect(result.current).toBe("/Users/test/project");
    });
    expect(localProjectSettings.getLocalProjectPath).toHaveBeenCalledWith(
      "proj-123"
    );
  });

  it("should return null for unconfigured project", async () => {
    vi.mocked(localProjectSettings.getLocalProjectPath).mockReturnValue(null);

    const { result } = renderHook(() => useProjectLocalPath("proj-123"));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("should update when project ID changes", async () => {
    vi.mocked(localProjectSettings.getLocalProjectPath)
      .mockReturnValueOnce("/path/project1")
      .mockReturnValueOnce("/path/project2");

    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectLocalPath(projectId),
      { initialProps: { projectId: "proj-1" } }
    );

    await waitFor(() => {
      expect(result.current).toBe("/path/project1");
    });

    rerender({ projectId: "proj-2" });

    await waitFor(() => {
      expect(result.current).toBe("/path/project2");
    });
  });
});
