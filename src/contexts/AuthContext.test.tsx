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
  resendVerificationEmail: vi.fn(),
  refreshUser: vi.fn(),
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
  resendVerificationEmail as firebaseResendVerificationEmail,
  refreshUser as firebaseRefreshUser,
  waitForAuthState,
} from "../lib/firebase";

function TestConsumer() {
  const {
    user,
    loading,
    isSignedIn,
    emailVerified,
    error,
    signUpWithEmail,
    resendVerificationEmail,
    refreshUser,
  } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="signed-in">{isSignedIn ? "yes" : "no"}</span>
      <span data-testid="email-verified">
        {emailVerified ? "verified" : "unverified"}
      </span>
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
      <button
        data-testid="resend-btn"
        onClick={() =>
          resendVerificationEmail().catch(() => {
            // Error is handled by context, ignore here
          })
        }
      >
        Resend
      </button>
      <button data-testid="refresh-btn" onClick={() => refreshUser()}>
        Refresh
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
      expect(screen.getByTestId("email-verified")).toHaveTextContent(
        "unverified"
      );
    });

    it("shows signed in when user exists", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        emailVerified: true,
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

      expect(screen.getByTestId("email-verified")).toHaveTextContent("verified");
      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "test@example.com"
      );
    });

    it("shows unverified when emailVerified is false", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        emailVerified: false,
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

      expect(screen.getByTestId("email-verified")).toHaveTextContent(
        "unverified"
      );
    });
  });

  describe("signUpWithEmail", () => {
    it("calls firebase signUpWithEmail", async () => {
      vi.mocked(firebaseSignUpWithEmail).mockResolvedValue({
        uid: "new-uid",
        email: "test@example.com",
        emailVerified: false,
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

  describe("resendVerificationEmail", () => {
    it("calls firebase resendVerificationEmail", async () => {
      vi.mocked(firebaseResendVerificationEmail).mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await act(async () => {
        screen.getByTestId("resend-btn").click();
      });

      expect(firebaseResendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe("refreshUser", () => {
    it("calls firebase refreshUser", async () => {
      vi.mocked(firebaseRefreshUser).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await act(async () => {
        screen.getByTestId("refresh-btn").click();
      });

      expect(firebaseRefreshUser).toHaveBeenCalled();
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
