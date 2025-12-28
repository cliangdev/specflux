import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectClaudeSessionId,
  snapshotExistingSessions,
  sessionExists,
  pollForClaudeSession,
} from "../claudeSessionDetector";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(() => Promise.resolve("/Users/test")),
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

vi.mock("../claudeSessionStore", () => ({
  saveClaudeSessionId: vi.fn().mockResolvedValue(undefined),
}));

import { readDir, stat } from "@tauri-apps/plugin-fs";
import { saveClaudeSessionId } from "../claudeSessionStore";

describe("claudeSessionDetector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectClaudeSessionId", () => {
    it("returns most recent UUID session", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "abc12345-1234-1234-1234-123456789abc.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "def12345-1234-1234-1234-123456789def.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockImplementation(async (path) => {
        if (typeof path === "string" && path.includes("abc12345")) {
          return { mtime: new Date("2024-01-01T10:00:00Z") } as Awaited<ReturnType<typeof stat>>;
        }
        return { mtime: new Date("2024-01-01T12:00:00Z") } as Awaited<ReturnType<typeof stat>>;
      });

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBe("def12345-1234-1234-1234-123456789def");
    });

    it("filters out agent-* files", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "agent-abc123.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "agent-def456.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "12345678-1234-1234-1234-123456789abc.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await detectClaudeSessionId("/Users/test/project");

      // Should only return the UUID session, not the agent files
      expect(result).toBe("12345678-1234-1234-1234-123456789abc");
    });

    it("returns null when no UUID sessions exist", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "agent-abc123.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "agent-def456.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBeNull();
    });

    it("returns null when directory does not exist", async () => {
      vi.mocked(readDir).mockRejectedValue(new Error("Directory not found"));

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBeNull();
    });

    it("skips directories", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "12345678-1234-1234-1234-123456789abc", isFile: false, isDirectory: true, isSymlink: false },
        { name: "87654321-1234-1234-1234-123456789def.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBe("87654321-1234-1234-1234-123456789def");
    });
  });

  describe("snapshotExistingSessions", () => {
    it("returns set of existing UUID session IDs", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "abc12345-1234-1234-1234-123456789abc.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "def12345-1234-1234-1234-123456789def.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "agent-xyz789.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await snapshotExistingSessions("/Users/test/project");

      expect(result.size).toBe(2);
      expect(result.has("abc12345-1234-1234-1234-123456789abc")).toBe(true);
      expect(result.has("def12345-1234-1234-1234-123456789def")).toBe(true);
      expect(result.has("agent-xyz789")).toBe(false);
    });

    it("returns empty set when no sessions exist", async () => {
      vi.mocked(readDir).mockRejectedValue(new Error("Directory not found"));

      const result = await snapshotExistingSessions("/Users/test/project");

      expect(result.size).toBe(0);
    });
  });

  describe("UUID filtering", () => {
    it("accepts valid UUID v4 format", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    });

    it("rejects invalid UUID formats", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "not-a-uuid.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "12345.jsonl", isFile: true, isDirectory: false, isSymlink: false },
        { name: "agent-a1b2c3d.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);

      const result = await detectClaudeSessionId("/Users/test/project");

      expect(result).toBeNull();
    });
  });

  describe("sessionExists", () => {
    it("returns true when session file exists", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "abc12345-1234-1234-1234-123456789abc.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await sessionExists("/Users/test/project", "abc12345-1234-1234-1234-123456789abc");
      expect(result).toBe(true);
    });

    it("returns false when session file does not exist", async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: "other1234-1234-1234-1234-123456789abc.jsonl", isFile: true, isDirectory: false, isSymlink: false },
      ]);
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2024-01-01T12:00:00Z"),
      } as Awaited<ReturnType<typeof stat>>);

      const result = await sessionExists("/Users/test/project", "abc12345-1234-1234-1234-123456789abc");
      expect(result).toBe(false);
    });

    it("returns false when directory cannot be read", async () => {
      vi.mocked(readDir).mockRejectedValue(new Error("Directory not found"));

      const result = await sessionExists("/Users/test/project", "abc12345-1234-1234-1234-123456789abc");
      expect(result).toBe(false);
    });
  });

  describe("pollForClaudeSession", () => {
    it("can be called without crashing", () => {
      vi.mocked(readDir).mockResolvedValue([]);

      // Just verify the function can be called without throwing
      expect(() => {
        pollForClaudeSession("/Users/test/project", "task:123", new Set(), new Date());
      }).not.toThrow();
    });

    it("accepts optional callback parameter", () => {
      vi.mocked(readDir).mockResolvedValue([]);

      const onDetected = vi.fn();
      expect(() => {
        pollForClaudeSession("/Users/test/project", "task:123", new Set(), new Date(), onDetected);
      }).not.toThrow();
    });
  });
});
