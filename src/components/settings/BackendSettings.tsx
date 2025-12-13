/**
 * Backend Settings Component
 *
 * Manages cloud backend configuration:
 * - Firebase authentication status
 * - Cloud sync settings
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getBackendSettings,
  updateBackendSettings,
  subscribeToBackendSettings,
  type BackendSettings as BackendSettingsType,
} from "../../stores/backendStore";
import { isUsingEmulator, signInWithTestAccount } from "../../lib/firebase";

export function BackendSettings() {
  const {
    user,
    loading: authLoading,
    isSignedIn,
    signInWithGitHub,
    signOut,
    error: authError,
  } = useAuth();
  const [settings, setSettings] =
    useState<BackendSettingsType>(getBackendSettings());
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dev sign-in form state
  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribe = subscribeToBackendSettings((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGitHub();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail || !devPassword) {
      setError("Email and password are required");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      // Try sign-in only (don't auto-create)
      await signInWithTestAccount(devEmail, devPassword, false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      if (message.includes("Account not found")) {
        setIsCreatingAccount(true);
        setError("Account not found. Click 'Create Account' to register.");
      } else {
        setError(message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleDevCreateAccount = async () => {
    if (!devEmail || !devPassword) {
      setError("Email and password are required");
      return;
    }
    if (devPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      // Create account and sign in
      await signInWithTestAccount(devEmail, devPassword, true);
      setIsCreatingAccount(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section: Authentication */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Authentication
        </h2>
        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          {authLoading ? (
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading authentication...</span>
            </div>
          ) : isSignedIn && user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-600 flex items-center justify-center text-white font-medium">
                    {user.displayName?.charAt(0) ||
                      user.email?.charAt(0) ||
                      "U"}
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {user.displayName || "User"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          ) : isUsingEmulator() ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Firebase Emulator Mode - Sign in with email/password
              </div>
              <form onSubmit={handleDevSignIn} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                    disabled={signingIn}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                    disabled={signingIn}
                  />
                </div>
                <div className="flex gap-2">
                  {isCreatingAccount ? (
                    <button
                      type="button"
                      onClick={handleDevCreateAccount}
                      disabled={signingIn}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-sm disabled:opacity-50 transition-colors"
                    >
                      {signingIn ? "Creating..." : "Create Account"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={signingIn}
                      className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded font-medium text-sm disabled:opacity-50 transition-colors"
                    >
                      {signingIn ? "Signing in..." : "Sign In"}
                    </button>
                  )}
                  {isCreatingAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingAccount(false);
                        setError(null);
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-gray-600 dark:text-gray-400">
                  Sign in to enable cloud sync and collaboration features.
                </div>
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {signingIn ? "Signing in..." : "Sign in with GitHub"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section: Cloud Backend */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cloud Backend
        </h2>
        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Cloud Sync Status
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isSignedIn
                  ? "Connected to Spring Boot backend"
                  : "Sign in to enable cloud features"}
              </div>
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                isSignedIn
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
              }`}
            >
              {isSignedIn ? "Connected" : "Disconnected"}
            </div>
          </div>

          {/* API Base URL */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              API Base URL
            </label>
            <input
              type="text"
              value={settings.v2BaseUrl}
              onChange={(e) =>
                updateBackendSettings({ v2BaseUrl: e.target.value })
              }
              disabled={!isSignedIn}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="http://localhost:8090"
            />
          </div>

          {!isSignedIn && (
            <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Sign in with GitHub to enable cloud features.
            </div>
          )}
        </div>
      </section>

      {/* Error Display */}
      {(error || authError) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error || authError}
        </div>
      )}

      {/* Info: What's synced */}
      <section className="text-sm text-gray-500 dark:text-gray-400">
        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
          What gets synced to the cloud?
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Projects, epics, tasks, and releases</li>
          <li>Repositories, skills, agents, and MCP servers</li>
          <li>User profile and preferences</li>
        </ul>
        <h3 className="font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2">
          What stays local?
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Terminal sessions and worktrees</li>
          <li>Local file operations</li>
        </ul>
      </section>
    </div>
  );
}
