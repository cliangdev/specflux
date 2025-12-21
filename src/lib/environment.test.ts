import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCurrentEnvironment,
  setEnvironmentOverride,
  hasEnvironmentOverride,
  clearEnvironmentOverride,
  getEnvironmentConfig,
  getApiBaseUrl,
  isDevelopmentMode,
} from "./environment";

describe("environment", () => {
  const originalEnv = { ...import.meta.env };
  const originalLocation = window.location;
  let localStorageMock: { [key: string]: string };
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock = {};
    reloadMock = vi.fn();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => localStorageMock[key] || null,
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      },
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
      (key: string) => {
        delete localStorageMock[key];
      },
    );

    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload: reloadMock },
      writable: true,
    });

    // Reset env vars
    Object.keys(import.meta.env).forEach((key) => {
      if (key.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, string>)[key];
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(import.meta.env, originalEnv);
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  describe("getCurrentEnvironment", () => {
    it("returns local by default", () => {
      expect(getCurrentEnvironment()).toBe("local");
    });

    it("returns localStorage override when set to staging", () => {
      localStorageMock["specflux_environment_override"] = "staging";
      expect(getCurrentEnvironment()).toBe("staging");
    });

    it("returns localStorage override when set to local", () => {
      localStorageMock["specflux_environment_override"] = "local";
      expect(getCurrentEnvironment()).toBe("local");
    });

    it("ignores invalid localStorage values", () => {
      localStorageMock["specflux_environment_override"] = "invalid";
      expect(getCurrentEnvironment()).toBe("local");
    });

    it("returns staging when VITE_ENV_NAME is staging", () => {
      (import.meta.env as Record<string, string>).VITE_ENV_NAME = "staging";
      expect(getCurrentEnvironment()).toBe("staging");
    });

    it("returns staging when MODE is staging", () => {
      (import.meta.env as Record<string, string>).MODE = "staging";
      expect(getCurrentEnvironment()).toBe("staging");
    });

    it("localStorage override takes precedence over env vars", () => {
      localStorageMock["specflux_environment_override"] = "local";
      (import.meta.env as Record<string, string>).VITE_ENV_NAME = "staging";
      expect(getCurrentEnvironment()).toBe("local");
    });
  });

  describe("hasEnvironmentOverride", () => {
    it("returns false when no override is set", () => {
      expect(hasEnvironmentOverride()).toBe(false);
    });

    it("returns true when override is set", () => {
      localStorageMock["specflux_environment_override"] = "staging";
      expect(hasEnvironmentOverride()).toBe(true);
    });
  });

  describe("setEnvironmentOverride", () => {
    it("sets override in localStorage", () => {
      (import.meta.env as Record<string, boolean>).DEV = true;
      setEnvironmentOverride("staging");
      expect(localStorageMock["specflux_environment_override"]).toBe("staging");
    });

    it("removes override when null is passed", () => {
      (import.meta.env as Record<string, boolean>).DEV = true;
      localStorageMock["specflux_environment_override"] = "staging";
      setEnvironmentOverride(null);
      expect(localStorageMock["specflux_environment_override"]).toBeUndefined();
    });

    it("reloads the page after setting override", () => {
      (import.meta.env as Record<string, boolean>).DEV = true;
      setEnvironmentOverride("staging");
      expect(reloadMock).toHaveBeenCalled();
    });

    it("does nothing in production mode", () => {
      (import.meta.env as Record<string, boolean>).DEV = false;
      setEnvironmentOverride("staging");
      expect(localStorageMock["specflux_environment_override"]).toBeUndefined();
      expect(reloadMock).not.toHaveBeenCalled();
    });
  });

  describe("clearEnvironmentOverride", () => {
    it("removes override from localStorage", () => {
      localStorageMock["specflux_environment_override"] = "staging";
      clearEnvironmentOverride();
      expect(localStorageMock["specflux_environment_override"]).toBeUndefined();
    });

    it("reloads the page", () => {
      clearEnvironmentOverride();
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe("getEnvironmentConfig", () => {
    it("returns local config by default", () => {
      const config = getEnvironmentConfig();
      expect(config.name).toBe("local");
      expect(config.displayName).toBe("Local");
      expect(config.apiBaseUrl).toBe("http://localhost:8090");
      expect(config.firebaseEmulatorUrl).toBe("http://127.0.0.1:9099");
    });

    it("returns staging config when environment is staging", () => {
      localStorageMock["specflux_environment_override"] = "staging";
      const config = getEnvironmentConfig();
      expect(config.name).toBe("staging");
      expect(config.displayName).toBe("Staging");
      expect(config.firebaseEmulatorUrl).toBeNull();
    });

    it("uses VITE_API_BASE_URL when set for local", () => {
      (import.meta.env as Record<string, string>).VITE_API_BASE_URL =
        "http://custom:9000";
      const config = getEnvironmentConfig();
      expect(config.apiBaseUrl).toBe("http://custom:9000");
    });

    it("uses VITE_STAGING_API_BASE_URL for staging", () => {
      localStorageMock["specflux_environment_override"] = "staging";
      (import.meta.env as Record<string, string>).VITE_STAGING_API_BASE_URL =
        "https://staging.example.com";
      const config = getEnvironmentConfig();
      expect(config.apiBaseUrl).toBe("https://staging.example.com");
    });
  });

  describe("getApiBaseUrl", () => {
    it("returns API base URL for current environment", () => {
      expect(getApiBaseUrl()).toBe("http://localhost:8090");
    });
  });

  describe("isDevelopmentMode", () => {
    it("returns true when DEV is true", () => {
      (import.meta.env as Record<string, boolean>).DEV = true;
      expect(isDevelopmentMode()).toBe(true);
    });

    it("returns false when DEV is false", () => {
      (import.meta.env as Record<string, boolean>).DEV = false;
      expect(isDevelopmentMode()).toBe(false);
    });
  });
});
