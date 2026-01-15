import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  STORAGE_KEYS,
  DYNAMIC_KEYS,
  getStorageItem,
  getStorageString,
  setStorageItem,
  setStorageString,
  removeStorageItem,
  hasStorageItem,
} from "../localStorage";

describe("localStorage service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("STORAGE_KEYS", () => {
    it("should have consistent prefix 'specflux:'", () => {
      const keys = Object.values(STORAGE_KEYS);
      keys.forEach((key) => {
        expect(key).toMatch(/^specflux:/);
      });
    });

    it("should have expected app-level keys", () => {
      expect(STORAGE_KEYS.APP_THEME).toBe("specflux:app:theme");
      expect(STORAGE_KEYS.APP_SIDEBAR).toBe("specflux:app:sidebar");
      expect(STORAGE_KEYS.APP_ENVIRONMENT).toBe("specflux:app:environment");
    });

    it("should have expected auth keys", () => {
      expect(STORAGE_KEYS.AUTH_SAVED_EMAIL).toBe("specflux:auth:saved-email");
      expect(STORAGE_KEYS.AUTH_PENDING_GITHUB).toBe("specflux:auth:pending-github");
      expect(STORAGE_KEYS.AUTH_GITHUB_CONNECTION).toBe("specflux:auth:github-connection");
      expect(STORAGE_KEYS.AUTH_LAST_USER_ID).toBe("specflux:auth:last-user-id");
    });

    it("should have expected project keys", () => {
      expect(STORAGE_KEYS.PROJECT_SELECTED_ID).toBe("specflux:project:selected-id");
      expect(STORAGE_KEYS.PROJECT_ROUTES).toBe("specflux:project:routes");
      expect(STORAGE_KEYS.PROJECT_SETTINGS).toBe("specflux:project:settings");
    });

    it("should have expected workspace keys", () => {
      expect(STORAGE_KEYS.WORKSPACE_PATH).toBe("specflux:workspace:path");
    });

    it("should have expected UI keys", () => {
      expect(STORAGE_KEYS.UI_TASKS_FILTERS).toBe("specflux:ui:tasks-filters");
      expect(STORAGE_KEYS.UI_EPICS_FILTERS).toBe("specflux:ui:epics-filters");
      expect(STORAGE_KEYS.UI_EPICS_VIEW).toBe("specflux:ui:epics-view");
    });

    it("should have expected terminal keys", () => {
      expect(STORAGE_KEYS.TERMINAL_PANEL).toBe("specflux:terminal:panel");
    });
  });

  describe("DYNAMIC_KEYS", () => {
    it("should generate PRD banner dismissed key with prdId", () => {
      const key = DYNAMIC_KEYS.prdBannerDismissed("prd-123");
      expect(key).toBe("specflux:ui:prd-banner-dismissed:prd-123");
    });

    it("should handle various prdId formats", () => {
      expect(DYNAMIC_KEYS.prdBannerDismissed("abc")).toBe(
        "specflux:ui:prd-banner-dismissed:abc"
      );
      expect(DYNAMIC_KEYS.prdBannerDismissed("123-456-789")).toBe(
        "specflux:ui:prd-banner-dismissed:123-456-789"
      );
    });
  });

  describe("getStorageItem", () => {
    it("should return null for non-existent key", () => {
      expect(getStorageItem("non-existent")).toBeNull();
    });

    it("should parse and return stored JSON object", () => {
      const data = { name: "test", value: 123 };
      localStorage.setItem("test-key", JSON.stringify(data));

      expect(getStorageItem("test-key")).toEqual(data);
    });

    it("should parse and return stored JSON array", () => {
      const data = [1, 2, 3, "four"];
      localStorage.setItem("test-key", JSON.stringify(data));

      expect(getStorageItem("test-key")).toEqual(data);
    });

    it("should parse and return stored primitive values", () => {
      localStorage.setItem("num-key", JSON.stringify(42));
      localStorage.setItem("bool-key", JSON.stringify(true));
      localStorage.setItem("str-key", JSON.stringify("hello"));

      expect(getStorageItem("num-key")).toBe(42);
      expect(getStorageItem("bool-key")).toBe(true);
      expect(getStorageItem("str-key")).toBe("hello");
    });

    it("should return null for invalid JSON", () => {
      localStorage.setItem("invalid-key", "not valid json {");

      expect(getStorageItem("invalid-key")).toBeNull();
    });
  });

  describe("getStorageString", () => {
    it("should return null for non-existent key", () => {
      expect(getStorageString("non-existent")).toBeNull();
    });

    it("should return raw string without JSON parsing", () => {
      localStorage.setItem("string-key", "raw string value");

      expect(getStorageString("string-key")).toBe("raw string value");
    });

    it("should return JSON string as-is without parsing", () => {
      const jsonString = '{"key": "value"}';
      localStorage.setItem("json-string-key", jsonString);

      expect(getStorageString("json-string-key")).toBe(jsonString);
    });
  });

  describe("setStorageItem", () => {
    it("should store object as JSON string", () => {
      const data = { name: "test", count: 5 };
      setStorageItem("obj-key", data);

      expect(localStorage.getItem("obj-key")).toBe(JSON.stringify(data));
    });

    it("should store array as JSON string", () => {
      const data = [1, 2, 3];
      setStorageItem("arr-key", data);

      expect(localStorage.getItem("arr-key")).toBe(JSON.stringify(data));
    });

    it("should store primitive values as JSON", () => {
      setStorageItem("num", 42);
      setStorageItem("bool", false);
      setStorageItem("str", "hello");

      expect(localStorage.getItem("num")).toBe("42");
      expect(localStorage.getItem("bool")).toBe("false");
      expect(localStorage.getItem("str")).toBe('"hello"');
    });

    it("should handle circular reference gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      setStorageItem("circular", circular);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("setStorageString", () => {
    it("should store raw string without JSON stringifying", () => {
      setStorageString("raw-key", "plain text");

      expect(localStorage.getItem("raw-key")).toBe("plain text");
    });

    it("should not add quotes around the string", () => {
      setStorageString("no-quotes", "test");

      expect(localStorage.getItem("no-quotes")).toBe("test");
      expect(localStorage.getItem("no-quotes")).not.toBe('"test"');
    });
  });

  describe("removeStorageItem", () => {
    it("should remove existing item", () => {
      localStorage.setItem("to-remove", "value");
      expect(localStorage.getItem("to-remove")).toBe("value");

      removeStorageItem("to-remove");

      expect(localStorage.getItem("to-remove")).toBeNull();
    });

    it("should not throw when removing non-existent item", () => {
      expect(() => removeStorageItem("non-existent")).not.toThrow();
    });
  });

  describe("hasStorageItem", () => {
    it("should return true for existing item", () => {
      localStorage.setItem("exists", "value");

      expect(hasStorageItem("exists")).toBe(true);
    });

    it("should return false for non-existent item", () => {
      expect(hasStorageItem("does-not-exist")).toBe(false);
    });

    it("should return true for empty string value", () => {
      localStorage.setItem("empty", "");

      expect(hasStorageItem("empty")).toBe(true);
    });
  });
});
