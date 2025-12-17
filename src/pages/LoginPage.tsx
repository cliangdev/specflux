import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const SAVED_EMAIL_KEY = "specflux-saved-email";

type AuthMode = "signin" | "signup";

// GitHub icon SVG component
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGitHub,
    resendVerificationEmail,
    refreshUser,
    loading,
    error,
    isSignedIn,
    emailVerified,
    user,
  } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState(() => {
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Redirect to board if signed in and verified
  useEffect(() => {
    if (isSignedIn && emailVerified) {
      navigate("/board", { replace: true });
    }
  }, [isSignedIn, emailVerified, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) return;

    if (authMode === "signup") {
      // Validate password length
      if (password.length < 8) {
        setLocalError("Password must be at least 8 characters");
        return;
      }
      // Validate password confirmation
      if (password !== confirmPassword) {
        setLocalError("Passwords don't match");
        return;
      }
    }

    setSubmitting(true);
    try {
      localStorage.setItem(SAVED_EMAIL_KEY, email);

      if (authMode === "signup") {
        await signUpWithEmail(email, password);
        setVerificationEmail(email);
        setVerificationPending(true);
      } else {
        await signInWithEmail(email, password);
        // Navigation will happen via the useEffect above
      }
    } catch {
      // Error is already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setGithubLoading(true);
    try {
      await signInWithGitHub();
      // Navigation will happen via the useEffect above
    } catch {
      // Error is already set in AuthContext
    } finally {
      setGithubLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendSuccess(false);
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      // Error handled by context
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setLocalError(null);
    try {
      await refreshUser();
      // After refresh, if emailVerified is still false, show message
      // We need a small delay to let the state update
      setTimeout(() => {
        if (!user?.emailVerified) {
          setLocalError("Email not verified yet. Please check your inbox.");
        }
        setCheckingVerification(false);
      }, 500);
    } catch {
      setCheckingVerification(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setVerificationPending(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const isLoading = loading || submitting;
  const displayError = localError || error;

  // Verification pending screen
  if (verificationPending || (isSignedIn && !emailVerified)) {
    const displayEmail = verificationEmail || user?.email || "";

    return (
      <div className="h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="w-80">
          {/* Logo/Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-600 mb-3">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
              SpecFlux
            </h1>
          </div>

          {/* Verification Card */}
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-100 dark:bg-accent-900/30 mb-4">
              <svg
                className="w-7 h-7 text-accent-600 dark:text-accent-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Check your email
            </h2>

            <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">
              We sent a verification link to:
            </p>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mb-4">
              {displayEmail}
            </p>

            <p className="text-sm text-surface-500 dark:text-surface-500 mb-6">
              Click the link in the email to verify your account.
            </p>

            {displayError && (
              <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md mb-4">
                {displayError}
              </div>
            )}

            {resendSuccess && (
              <div className="p-2.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-md mb-4">
                Verification email sent!
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={checkingVerification}
              className="btn btn-primary w-full text-sm py-2.5 mb-4"
            >
              {checkingVerification ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                "I've Verified My Email"
              )}
            </button>

            <p className="text-xs text-surface-500 dark:text-surface-500 mb-2">
              Didn't receive it?
            </p>
            <div className="flex items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleResendEmail}
                className="text-accent-600 dark:text-accent-400 hover:underline"
              >
                Resend email
              </button>
              <span className="text-surface-300 dark:text-surface-600">·</span>
              <button
                type="button"
                onClick={handleUseDifferentEmail}
                className="text-accent-600 dark:text-accent-400 hover:underline"
              >
                Use different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="w-80">
        {/* Logo/Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-600 mb-3">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
            SpecFlux
          </h1>
        </div>

        {/* Login Card */}
        <div className="card p-5">
          {/* Tab Toggle */}
          <div className="flex mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setLocalError(null);
              }}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                authMode === "signin"
                  ? "text-surface-900 dark:text-surface-100 border-accent-600"
                  : "text-surface-500 dark:text-surface-400 border-transparent hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setLocalError(null);
              }}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                authMode === "signup"
                  ? "text-surface-900 dark:text-surface-100 border-accent-600"
                  : "text-surface-500 dark:text-surface-400 border-transparent hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* GitHub OAuth Button */}
          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={isLoading || githubLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#24292e] hover:bg-[#2f363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {githubLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting to GitHub...
              </>
            ) : (
              <>
                <GitHubIcon className="w-5 h-5" />
                Continue with GitHub
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200 dark:border-surface-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-surface-800 text-surface-500">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-sm"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                autoFocus={!email}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-sm"
                placeholder={authMode === "signup" ? "At least 8 characters" : "Enter password"}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                disabled={isLoading}
                autoFocus={!!email && authMode === "signin"}
              />
              {authMode === "signup" && (
                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                  At least 8 characters
                </p>
              )}
            </div>

            {authMode === "signup" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input text-sm"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            )}

            {displayError && (
              <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
                {displayError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full text-sm py-2"
              disabled={
                isLoading ||
                !email ||
                !password ||
                (authMode === "signup" && !confirmPassword)
              }
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {authMode === "signup" ? "Creating account..." : "Signing in..."}
                </>
              ) : authMode === "signup" ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
