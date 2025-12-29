import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import * as AuthContext from "../contexts/AuthContext";
import * as oauthTauri from "../lib/oauth-tauri";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({
  isUsingEmulator: vi.fn(() => false),
}));

vi.mock("../lib/oauth-tauri", () => ({
  isTauri: vi.fn(() => false),
}));

const mockUseAuth = {
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithGitHub: vi.fn(),
  signInWithGoogle: vi.fn(),
  loading: false,
  error: null,
  isSignedIn: false,
};

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContext.useAuth).mockReturnValue(mockUseAuth as ReturnType<typeof AuthContext.useAuth>);
    vi.mocked(oauthTauri.isTauri).mockReturnValue(false);
  });

  describe("OAuth buttons in browser", () => {
    it("shows both GitHub and Google buttons in browser", () => {
      vi.mocked(oauthTauri.isTauri).mockReturnValue(false);
      renderLoginPage();

      expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });

    it("calls signInWithGitHub when GitHub button is clicked", async () => {
      renderLoginPage();

      const githubButton = screen.getByText("Continue with GitHub");
      fireEvent.click(githubButton);

      expect(mockUseAuth.signInWithGitHub).toHaveBeenCalledTimes(1);
    });

    it("calls signInWithGoogle when Google button is clicked", async () => {
      renderLoginPage();

      const googleButton = screen.getByText("Continue with Google");
      fireEvent.click(googleButton);

      expect(mockUseAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  describe("OAuth buttons in Tauri desktop app", () => {
    it("hides GitHub button in Tauri desktop app", () => {
      vi.mocked(oauthTauri.isTauri).mockReturnValue(true);
      renderLoginPage();

      expect(screen.queryByText("Continue with GitHub")).not.toBeInTheDocument();
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });

    it("shows Google button in Tauri desktop app", () => {
      vi.mocked(oauthTauri.isTauri).mockReturnValue(true);
      renderLoginPage();

      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });
  });

  describe("loading states", () => {
    it("shows loading state for GitHub button when signing in", async () => {
      renderLoginPage();

      const githubButton = screen.getByText("Continue with GitHub");
      fireEvent.click(githubButton);

      expect(screen.getByText("Connecting to GitHub...")).toBeInTheDocument();
    });

    it("shows loading state for Google button when signing in", async () => {
      renderLoginPage();

      const googleButton = screen.getByText("Continue with Google");
      fireEvent.click(googleButton);

      expect(screen.getByText("Connecting to Google...")).toBeInTheDocument();
    });

    it("disables all OAuth buttons when one is loading", async () => {
      renderLoginPage();

      const googleButton = screen.getByText("Continue with Google");
      fireEvent.click(googleButton);

      const githubButton = screen.getByText("Continue with GitHub").closest("button");
      expect(githubButton).toBeDisabled();
    });
  });

  describe("email/password form", () => {
    it("shows email and password inputs", () => {
      renderLoginPage();

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("shows confirm password input in signup mode", () => {
      renderLoginPage();

      const signUpTab = screen.getByText("Sign Up");
      fireEvent.click(signUpTab);

      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    });

    it("calls signInWithEmail when form is submitted in signin mode", async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      // Submit the form
      const form = emailInput.closest("form");
      if (form) fireEvent.submit(form);

      expect(mockUseAuth.signInWithEmail).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });
});
