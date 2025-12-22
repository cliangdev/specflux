import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getClaudeSessionId,
  saveClaudeSessionId,
  removeClaudeSessionId,
  buildContextKey,
} from "../claudeSessionStore";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";

describe("claudeSessionStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildContextKey", () => {
    it("builds key from context type and id", () => {
      expect(buildContextKey("task", "task_123")).toBe("task-task_123");
      expect(buildContextKey("epic", "epic_456")).toBe("epic-epic_456");
      expect(buildContextKey("prd", "prd_789")).toBe("prd-prd_789");
    });
  });

  describe("getClaudeSessionId", () => {
    it("returns session id when it exists", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          "task-task_123": "uuid-session-id",
        })
      );

      const result = await getClaudeSessionId("/project", "task-task_123");

      expect(result).toBe("uuid-session-id");
    });

    it("returns null when context key not found", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          "task-task_123": "uuid-session-id",
        })
      );

      const result = await getClaudeSessionId("/project", "task-task_999");

      expect(result).toBeNull();
    });

    it("returns null when store file does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await getClaudeSessionId("/project", "task-task_123");

      expect(result).toBeNull();
    });

    it("returns null on read error", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockRejectedValue(new Error("Read error"));

      const result = await getClaudeSessionId("/project", "task-task_123");

      expect(result).toBeNull();
    });
  });

  describe("saveClaudeSessionId", () => {
    it("saves session id to new store", async () => {
      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeTextFile).mockResolvedValue(undefined);

      await saveClaudeSessionId("/project", "task-task_123", "uuid-session");

      expect(mkdir).toHaveBeenCalledWith("/project/.specflux", { recursive: true });
      expect(writeTextFile).toHaveBeenCalledWith(
        "/project/.specflux/claude-sessions.json",
        expect.stringContaining('"task-task_123": "uuid-session"')
      );
    });

    it("merges with existing store", async () => {
      vi.mocked(exists).mockImplementation(async (path) => {
        return typeof path === "string" && path.includes("claude-sessions.json");
      });
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          "epic-epic_456": "existing-uuid",
        })
      );
      vi.mocked(writeTextFile).mockResolvedValue(undefined);

      await saveClaudeSessionId("/project", "task-task_123", "new-uuid");

      expect(writeTextFile).toHaveBeenCalledWith(
        "/project/.specflux/claude-sessions.json",
        expect.stringContaining('"epic-epic_456": "existing-uuid"')
      );
      expect(writeTextFile).toHaveBeenCalledWith(
        "/project/.specflux/claude-sessions.json",
        expect.stringContaining('"task-task_123": "new-uuid"')
      );
    });
  });

  describe("removeClaudeSessionId", () => {
    it("removes session id from store", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          "task-task_123": "uuid-1",
          "epic-epic_456": "uuid-2",
        })
      );
      vi.mocked(writeTextFile).mockResolvedValue(undefined);

      await removeClaudeSessionId("/project", "task-task_123");

      const writeCall = vi.mocked(writeTextFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent).not.toHaveProperty("task-task_123");
      expect(writtenContent).toHaveProperty("epic-epic_456", "uuid-2");
    });
  });
});
