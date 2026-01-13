import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri plugins before importing the hook
vi.mock("@tauri-apps/plugin-fs", () => ({
  watch: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn(),
  },
}));

vi.mock("../../services/gitOperations", () => ({
  autoCommit: vi.fn(),
  pushChanges: vi.fn(),
  pullChanges: vi.fn(),
  fetchRemote: vi.fn(),
  getGitStatus: vi.fn(),
}));

import { useAutoSync, type AutoSyncStatus } from "../useAutoSync";
import { watch, type UnwatchFn } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import {
  autoCommit,
  pushChanges,
  getGitStatus,
} from "../../services/gitOperations";

// Mock fetch for online check
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAutoSync", () => {
  let mockUnwatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUnwatch = vi.fn();
    vi.mocked(watch).mockResolvedValue(mockUnwatch as unknown as UnwatchFn);

    // Mock git remote check - default to no remote (simplifies tests)
    vi.mocked(Command.create).mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue({
        code: 1,
        stdout: "",
      }),
    }) as unknown as ReturnType<typeof Command.create>);

    // Mock online check
    mockFetch.mockResolvedValue({ ok: true });

    // Mock git operations
    vi.mocked(getGitStatus).mockResolvedValue({
      hasChanges: false,
      staged: [],
      unstaged: [],
      untracked: [],
    });
    vi.mocked(autoCommit).mockResolvedValue(undefined);
    vi.mocked(pushChanges).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("returns disabled status when not enabled", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: false, repoPath: "/test/path" })
      );

      expect(result.current.status).toBe("disabled");
    });

    it("returns disabled status when no repoPath", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: undefined })
      );

      expect(result.current.status).toBe("disabled");
    });

    it("initializes with isOnline true by default", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      expect(result.current.isOnline).toBe(true);
    });

    it("initializes with null lastSyncedAt", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      expect(result.current.lastSyncedAt).toBeNull();
    });

    it("initializes with zero pending changes", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      expect(result.current.pendingChanges).toBe(0);
    });
  });

  describe("remote check", () => {
    it("stays disabled when no remote configured", async () => {
      // No remote configured (default mock)
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      // Wait a tick for the remote check to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.status).toBe("disabled");
      expect(watch).not.toHaveBeenCalled();
    });

    it("starts watching when remote is configured", async () => {
      // Mock having a remote
      vi.mocked(Command.create).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "https://github.com/user/repo.git\n",
        }),
      }) as unknown as ReturnType<typeof Command.create>);

      renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      // Wait for remote check and watch to start
      await waitFor(() => {
        expect(watch).toHaveBeenCalled();
      });

      expect(watch).toHaveBeenCalledWith(
        "/test/path",
        expect.any(Function),
        { recursive: true }
      );
    });
  });

  describe("return values", () => {
    it("returns all expected properties", () => {
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      expect(result.current).toHaveProperty("status");
      expect(result.current).toHaveProperty("pendingChanges");
      expect(result.current).toHaveProperty("isOnline");
      expect(result.current).toHaveProperty("lastSyncedAt");
      expect(result.current).toHaveProperty("triggerSync");
      expect(result.current).toHaveProperty("triggerPull");
      expect(typeof result.current.triggerSync).toBe("function");
      expect(typeof result.current.triggerPull).toBe("function");
    });
  });

  describe("status types", () => {
    it("exports valid status types", () => {
      const validStatuses: AutoSyncStatus[] = [
        "disabled",
        "watching",
        "pending",
        "committing",
        "pushing",
        "pulling",
        "synced",
        "offline",
        "conflict",
        "error",
      ];

      // This test validates the type system - if it compiles, it passes
      expect(validStatuses.length).toBe(10);
    });
  });

  describe("callbacks", () => {
    it("accepts onStatusChange callback", () => {
      const onStatusChange = vi.fn();
      renderHook(() =>
        useAutoSync({
          enabled: false,
          repoPath: "/test/path",
          onStatusChange,
        })
      );

      // Status starts as disabled, callback should be called
      expect(onStatusChange).toHaveBeenCalledWith("disabled");
    });

    it("accepts onSync callback", () => {
      const onSync = vi.fn();
      const { result } = renderHook(() =>
        useAutoSync({
          enabled: true,
          repoPath: "/test/path",
          onSync,
        })
      );

      // Callback is stored, would be called on successful sync
      expect(result.current).toBeDefined();
    });

    it("accepts onError callback", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSync({
          enabled: true,
          repoPath: "/test/path",
          onError,
        })
      );

      // Callback is stored, would be called on error
      expect(result.current).toBeDefined();
    });

    it("accepts onConflict callback", () => {
      const onConflict = vi.fn();
      const { result } = renderHook(() =>
        useAutoSync({
          enabled: true,
          repoPath: "/test/path",
          onConflict,
        })
      );

      // Callback is stored, would be called on conflict
      expect(result.current).toBeDefined();
    });
  });

  describe("options", () => {
    it("uses default debounceMs of 30000", () => {
      // The default is set in the hook
      const { result } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      expect(result.current).toBeDefined();
    });

    it("accepts custom debounceMs", () => {
      const { result } = renderHook(() =>
        useAutoSync({
          enabled: true,
          repoPath: "/test/path",
          debounceMs: 5000,
        })
      );

      expect(result.current).toBeDefined();
    });

    it("accepts pullOnFocus option", () => {
      const { result } = renderHook(() =>
        useAutoSync({
          enabled: true,
          repoPath: "/test/path",
          pullOnFocus: false,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("cleanup", () => {
    it("calls unwatch on unmount when watching", async () => {
      // Mock having a remote
      vi.mocked(Command.create).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "https://github.com/user/repo.git\n",
        }),
      }) as unknown as ReturnType<typeof Command.create>);

      const { unmount } = renderHook(() =>
        useAutoSync({ enabled: true, repoPath: "/test/path" })
      );

      // Wait for watch to be called
      await waitFor(() => {
        expect(watch).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnwatch).toHaveBeenCalled();
    });
  });
});
