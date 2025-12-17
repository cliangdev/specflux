import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

// Mock Firebase functions
vi.mock("../lib/firebase", () => ({
  initializeFirebase: vi.fn(),
  signInWithGitHub: vi.fn(),
  signInWithTestAccount: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(),
  onAuthStateChange: vi.fn(() => vi.fn()),
  handleRedirectResult: vi.fn(() => Promise.resolve(null)),
  waitForAuthState: vi.fn(() => Promise.resolve(null)),
}));

// Mock API
vi.mock("../api", () => ({
  api: {
    users: {
      getCurrentUser: vi.fn(),
    },
  },
}));

import {
  signUpWithEmail as firebaseSignUpWithEmail,
  waitForAuthState,
} from "../lib/firebase";

function TestConsumer() {
  const { user, loading, isSignedIn, error, signUpWithEmail } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="signed-in">{isSignedIn ? "yes" : "no"}</span>
      <span data-testid="error">{error || "no-error"}</span>
      <span data-testid="user-email">{user?.email || "no-email"}</span>
      <button
        data-testid="signup-btn"
        onClick={() =>
          signUpWithEmail("test@example.com", "password123").catch(() => {
            // Error is handled by context, ignore here
          })
        }
      >
        Sign Up
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(waitForAuthState).mockResolvedValue(null);
  });

  describe("AuthProvider", () => {
    it("shows loading state initially then resolves", async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Should eventually resolve to loaded
      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });
    });

    it("shows not signed in when no user", async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("signed-in")).toHaveTextContent("no");
    });

    it("shows signed in when user exists", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
      };
      vi.mocked(waitForAuthState).mockResolvedValue(mockUser as never);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("signed-in")).toHaveTextContent("yes");
      });

      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "test@example.com"
      );
    });
  });

  describe("signUpWithEmail", () => {
    it("calls firebase signUpWithEmail", async () => {
      vi.mocked(firebaseSignUpWithEmail).mockResolvedValue({
        uid: "new-uid",
        email: "test@example.com",
      } as never);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await act(async () => {
        screen.getByTestId("signup-btn").click();
      });

      expect(firebaseSignUpWithEmail).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("sets error on email-already-in-use", async () => {
      const error = new Error("Email already in use");
      (error as Error & { code: string }).code = "auth/email-already-in-use";
      vi.mocked(firebaseSignUpWithEmail).mockRejectedValue(error);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // Click triggers the sign up which will fail
      screen.getByTestId("signup-btn").click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "An account with this email already exists"
        );
      });
    });

    it("sets error on weak-password", async () => {
      const error = new Error("Weak password");
      (error as Error & { code: string }).code = "auth/weak-password";
      vi.mocked(firebaseSignUpWithEmail).mockRejectedValue(error);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // Click triggers the sign up which will fail
      screen.getByTestId("signup-btn").click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "Password must be at least 8 characters"
        );
      });
    });
  });

  describe("useAuth hook", () => {
    it("throws when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
