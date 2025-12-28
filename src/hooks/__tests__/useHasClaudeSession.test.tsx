import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock dependencies before importing the hook
vi.mock("../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

vi.mock("../../services/claudeSessionStore", () => ({
  getClaudeSessionId: vi.fn(),
  buildContextKey: vi.fn((type, id) => `${type}:${id}`),
}));

vi.mock("../../services/claudeSessionDetector", () => ({
  sessionExists: vi.fn(),
}));

import { useHasClaudeSession } from "../useHasClaudeSession";
import { useProject } from "../../contexts/ProjectContext";
import { getClaudeSessionId } from "../../services/claudeSessionStore";
import { sessionExists } from "../../services/claudeSessionDetector";

describe("useHasClaudeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when project has no localPath", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test" },
    } as ReturnType<typeof useProject>);

    const { result } = renderHook(() => useHasClaudeSession("task", "task_123"));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
    expect(getClaudeSessionId).not.toHaveBeenCalled();
  });

  it("returns false when contextId is undefined", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);

    const { result } = renderHook(() => useHasClaudeSession("task", undefined));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
    expect(getClaudeSessionId).not.toHaveBeenCalled();
  });

  it("returns false when no session ID is stored", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockResolvedValue(null);

    const { result } = renderHook(() => useHasClaudeSession("task", "task_123"));

    await waitFor(() => {
      expect(getClaudeSessionId).toHaveBeenCalledWith("/path/to/project", "task:task_123");
    });
    expect(result.current).toBe(false);
  });

  it("returns true when session exists in Claude storage", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockResolvedValue("session-uuid-123");
    vi.mocked(sessionExists).mockResolvedValue(true);

    const { result } = renderHook(() => useHasClaudeSession("task", "task_123"));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(sessionExists).toHaveBeenCalledWith("/path/to/project", "session-uuid-123");
  });

  it("returns false when session ID is stored but file no longer exists", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockResolvedValue("stale-session-id");
    vi.mocked(sessionExists).mockResolvedValue(false);

    const { result } = renderHook(() => useHasClaudeSession("task", "task_123"));

    await waitFor(() => {
      expect(sessionExists).toHaveBeenCalled();
    });
    expect(result.current).toBe(false);
  });

  it("handles errors gracefully", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockRejectedValue(new Error("Failed to read"));

    const { result } = renderHook(() => useHasClaudeSession("task", "task_123"));

    await waitFor(() => {
      expect(getClaudeSessionId).toHaveBeenCalled();
    });
    expect(result.current).toBe(false);
  });

  it("uses correct context key for different context types", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockResolvedValue(null);

    renderHook(() => useHasClaudeSession("epic", "epic_456"));

    await waitFor(() => {
      expect(getClaudeSessionId).toHaveBeenCalledWith("/path/to/project", "epic:epic_456");
    });
  });

  it("re-checks when contextId changes", async () => {
    vi.mocked(useProject).mockReturnValue({
      currentProject: { id: "proj_123", name: "Test", localPath: "/path/to/project" },
    } as ReturnType<typeof useProject>);
    vi.mocked(getClaudeSessionId).mockResolvedValue(null);

    const { rerender } = renderHook(
      ({ contextId }) => useHasClaudeSession("task", contextId),
      { initialProps: { contextId: "task_1" } }
    );

    await waitFor(() => {
      expect(getClaudeSessionId).toHaveBeenCalledWith("/path/to/project", "task:task_1");
    });

    vi.clearAllMocks();

    rerender({ contextId: "task_2" });

    await waitFor(() => {
      expect(getClaudeSessionId).toHaveBeenCalledWith("/path/to/project", "task:task_2");
    });
  });
});
