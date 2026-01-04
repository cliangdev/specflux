import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  isGitHubConnected,
} from "../githubConnection";

// Mock Tauri OAuth plugin
vi.mock("@fabianlars/tauri-plugin-oauth", () => ({
  start: vi.fn(),
  onUrl: vi.fn(),
  cancel: vi.fn(),
}));

// Mock Tauri shell plugin
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

// Mock API client
vi.mock("../../api/client", () => ({
  api: {
    github: {
      disconnectGithub: vi.fn(),
      getGithubStatus: vi.fn(),
    },
  },
}));

describe("githubConnection", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("getGitHubStatus", () => {
    it("should return disconnected status when no data stored", () => {
      const status = getGitHubStatus();
      expect(status.isConnected).toBe(false);
      expect(status.username).toBeUndefined();
    });

    it("should return stored connection status", () => {
      const mockStatus = {
        isConnected: true,
        username: "testuser",
        avatarUrl: "https://github.com/avatar.png",
        connectedAt: new Date("2024-01-01"),
      };

      localStorage.setItem(
        "specflux:github:connection",
        JSON.stringify(mockStatus)
      );

      const status = getGitHubStatus();
      expect(status.isConnected).toBe(true);
      expect(status.username).toBe("testuser");
      expect(status.avatarUrl).toBe("https://github.com/avatar.png");
      expect(status.connectedAt).toBeInstanceOf(Date);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem("specflux:github:connection", "invalid json");
      const status = getGitHubStatus();
      expect(status.isConnected).toBe(false);
    });
  });

  describe("isGitHubConnected", () => {
    it("should return false when not connected", () => {
      expect(isGitHubConnected()).toBe(false);
    });

    it("should return true when connected", () => {
      localStorage.setItem(
        "specflux:github:connection",
        JSON.stringify({ isConnected: true, username: "test" })
      );
      expect(isGitHubConnected()).toBe(true);
    });
  });

  describe("connectGitHub", () => {
    it("should throw error when OAuth server fails to start", async () => {
      const { start } = await import("@fabianlars/tauri-plugin-oauth");
      vi.mocked(start).mockRejectedValue(new Error("Failed to start server"));

      await expect(connectGitHub()).rejects.toThrow("Failed to start server");
    });

    it("should store connection data on successful OAuth", async () => {
      const { start, onUrl } = await import("@fabianlars/tauri-plugin-oauth");
      const { open } = await import("@tauri-apps/plugin-shell");

      vi.mocked(start).mockResolvedValue(8000);
      vi.mocked(open).mockResolvedValue();

      // Mock onUrl to immediately call the callback
      vi.mocked(onUrl).mockImplementation(async (callback) => {
        // Simulate OAuth callback
        setTimeout(() => {
          callback(
            "http://localhost:8000?token=abc123&username=testuser&avatar_url=https://github.com/avatar.png"
          );
        }, 100);
        return () => {};
      });

      // Start the connection in the background
      const connectPromise = connectGitHub();

      // Wait for connection to complete
      await connectPromise;

      const stored = localStorage.getItem("specflux:github:connection");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.isConnected).toBe(true);
      expect(parsed.username).toBe("testuser");
      expect(parsed.avatarUrl).toBe("https://github.com/avatar.png");
    });

    it("should timeout if no response received", async () => {
      const { start, onUrl, cancel } = await import("@fabianlars/tauri-plugin-oauth");
      const { open } = await import("@tauri-apps/plugin-shell");

      vi.useFakeTimers();

      vi.mocked(start).mockResolvedValue(8000);
      vi.mocked(open).mockResolvedValue();
      vi.mocked(onUrl).mockResolvedValue(() => {});
      vi.mocked(cancel).mockResolvedValue(undefined);

      let caughtError: Error | undefined;

      // Wrap in try-catch to prevent unhandled rejection
      const connectPromise = connectGitHub().catch((err) => {
        caughtError = err;
      });

      // Fast-forward time past the timeout
      await vi.advanceTimersByTimeAsync(121000);

      // Wait for the promise to settle
      await connectPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError?.message).toContain("OAuth timeout");

      vi.useRealTimers();
    });
  });

  describe("disconnectGitHub", () => {
    it("should clear stored connection data", async () => {
      const { api } = await import("../../api/client");
      vi.mocked(api.github.disconnectGithub).mockResolvedValue(undefined);

      localStorage.setItem(
        "specflux:github:connection",
        JSON.stringify({ isConnected: true, username: "test" })
      );

      await disconnectGitHub();

      const stored = localStorage.getItem("specflux:github:connection");
      expect(stored).toBeNull();
      expect(api.github.disconnectGithub).toHaveBeenCalled();
    });

    it("should not throw if no data to clear", async () => {
      const { api } = await import("../../api/client");
      vi.mocked(api.github.disconnectGithub).mockResolvedValue(undefined);

      await expect(disconnectGitHub()).resolves.not.toThrow();
    });

    it("should throw error if API call fails", async () => {
      const { api } = await import("../../api/client");
      vi.mocked(api.github.disconnectGithub).mockRejectedValue(
        new Error("API error")
      );

      await expect(disconnectGitHub()).rejects.toThrow("API error");
    });
  });
});
