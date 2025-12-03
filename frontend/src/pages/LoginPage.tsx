import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const SAVED_EMAIL_KEY = "specflux-saved-email";

export default function LoginPage() {
  const { signInWithEmail, loading, error, isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => {
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect to board if already signed in
  useEffect(() => {
    if (isSignedIn) {
      navigate("/board", { replace: true });
    }
  }, [isSignedIn, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      // Save email for convenience
      localStorage.setItem(SAVED_EMAIL_KEY, email);
      await signInWithEmail(email, password);
      // Navigation will happen via the useEffect above
    } catch {
      // Error is already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;

  return (
    <div className="h-screen flex items-center justify-center bg-system-50 dark:bg-system-950">
      <div className="w-80">
        {/* Logo/Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-3">
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
          <h1 className="text-xl font-semibold text-system-900 dark:text-system-100">
            SpecFlux
          </h1>
        </div>

        {/* Login Card */}
        <div className="card p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-system-600 dark:text-system-400 mb-1"
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
                className="block text-xs font-medium text-system-600 dark:text-system-400 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-sm"
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLoading}
                autoFocus={!!email}
              />
            </div>

            {error && (
              <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full text-sm py-2"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
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
