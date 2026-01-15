import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkPluginInstalled,
  checkPluginUpdateAvailable,
  getBundledPluginVersion,
  updatePlugin,
  isClaudeCliAvailable,
} from "../pluginManager";

vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn(() => ({
      execute: vi.fn(),
    })),
  },
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  platform: vi.fn(() => Promise.resolve("darwin")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  copyFile: vi.fn(),
  readDir: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join("/"))),
  homeDir: vi.fn(() => Promise.resolve("/Users/test")),
  resolveResource: vi.fn(),
}));

import { Command } from "@tauri-apps/plugin-shell";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { resolveResource } from "@tauri-apps/api/path";

describe("pluginManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkPluginInstalled", () => {
    it("returns installed: false when installed_plugins.json does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await checkPluginInstalled();

      expect(result).toEqual({ installed: false });
    });

    it("returns installed: true with version when plugin is found", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          version: 2,
          plugins: {
            "specflux@specflux-local": [
              {
                version: "1.0.0",
                installPath: "/path/to/plugin",
              },
            ],
          },
        })
      );

      const result = await checkPluginInstalled();

      expect(result).toEqual({
        installed: true,
        version: "1.0.0",
        installPath: "/path/to/plugin",
      });
    });

    it("returns installed: false when plugin is not in the list", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          version: 2,
          plugins: {
            "other-plugin@marketplace": [],
          },
        })
      );

      const result = await checkPluginInstalled();

      expect(result).toEqual({ installed: false });
    });

    it("returns error when reading file fails", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockRejectedValue(new Error("File read error"));

      const result = await checkPluginInstalled();

      expect(result.installed).toBe(false);
      expect(result.error).toBe("File read error");
    });
  });

  describe("getBundledPluginVersion", () => {
    it("returns version from bundled plugin.json", async () => {
      const result = await getBundledPluginVersion();

      expect(result).toBe("1.0.2");
    });
  });

  describe("checkPluginUpdateAvailable", () => {
    it("returns updateAvailable: true when installed version is older than bundled", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          version: 2,
          plugins: {
            "specflux@specflux-local": [{ version: "1.0.0" }],
          },
        })
      );

      const result = await checkPluginUpdateAvailable();

      expect(result.updateAvailable).toBe(true);
      expect(result.installedVersion).toBe("1.0.0");
      expect(result.bundledVersion).toBe("1.0.2");
    });

    it("returns updateAvailable: false when versions are equal", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readTextFile).mockResolvedValue(
        JSON.stringify({
          version: 2,
          plugins: {
            "specflux@specflux-local": [{ version: "1.0.2" }],
          },
        })
      );

      const result = await checkPluginUpdateAvailable();

      expect(result.updateAvailable).toBe(false);
      expect(result.installedVersion).toBe("1.0.2");
      expect(result.bundledVersion).toBe("1.0.2");
    });

    it("returns updateAvailable: true when plugin is not installed", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await checkPluginUpdateAvailable();

      expect(result.updateAvailable).toBe(true);
      expect(result.installedVersion).toBe(null);
      expect(result.bundledVersion).toBe("1.0.2");
    });
  });

  describe("isClaudeCliAvailable", () => {
    it("returns true when CLI command succeeds", async () => {
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({ code: 0, stdout: "", stderr: "" }),
      } as unknown as ReturnType<typeof Command.create>);

      const result = await isClaudeCliAvailable();

      expect(result).toBe(true);
    });

    it("returns false when CLI command fails", async () => {
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({ code: 1, stdout: "", stderr: "" }),
      } as unknown as ReturnType<typeof Command.create>);

      const result = await isClaudeCliAvailable();

      expect(result).toBe(false);
    });
  });
});

