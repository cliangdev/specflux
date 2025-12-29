import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isTauri, OAuthError } from "./oauth-tauri";

describe("oauth-tauri", () => {
  describe("isTauri", () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Reset window to a clean state
      global.window = {} as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it("returns false when not in Tauri environment", () => {
      expect(isTauri()).toBe(false);
    });

    it("returns true when window.isTauri is true (Tauri 2.x)", () => {
      (global.window as unknown as { isTauri: boolean }).isTauri = true;
      expect(isTauri()).toBe(true);
    });

    it("returns true when __TAURI_INTERNALS__ exists (Tauri 2.x)", () => {
      (global.window as unknown as { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ = {};
      expect(isTauri()).toBe(true);
    });

    it("returns true when __TAURI__ exists (Tauri 1.x)", () => {
      (global.window as unknown as { __TAURI__: object }).__TAURI__ = {};
      expect(isTauri()).toBe(true);
    });
  });

  describe("OAuthError", () => {
    it("creates error with message and code", () => {
      const error = new OAuthError("Test error", "timeout");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("timeout");
      expect(error.name).toBe("OAuthError");
    });

    it("supports all error codes", () => {
      const codes = ["timeout", "cancelled", "server_error", "invalid_response"] as const;
      codes.forEach((code) => {
        const error = new OAuthError("Test", code);
        expect(error.code).toBe(code);
      });
    });

    it("is instanceof Error", () => {
      const error = new OAuthError("Test", "timeout");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OAuthError);
    });
  });
});
