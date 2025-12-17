import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  initializeFirebase,
  signInWithGitHub as firebaseSignInWithGitHub,
  signInWithTestAccount,
  signUpWithEmail as firebaseSignUpWithEmail,
  signOut as firebaseSignOut,
  getIdToken as firebaseGetIdToken,
  onAuthStateChange,
  handleRedirectResult,
  waitForAuthState,
  type User,
} from "../lib/firebase";
import { api } from "../api";

interface AuthContextValue {
  /** Current Firebase user, null if not signed in */
  user: User | null;
  /** Whether auth state is still loading */
  loading: boolean;
  /** Whether user is signed in */
  isSignedIn: boolean;
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign up with email and password */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign in with GitHub OAuth */
  signInWithGitHub: () => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Get current ID token for API calls */
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  /** Error message if auth failed */
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase and subscribe to auth state changes
  useEffect(() => {
    console.log("[AuthContext] Initializing Firebase...");
    initializeFirebase();

    // Wait for auth state to be restored from persistence (localStorage)
    // This uses Firebase's refresh token to restore the session
    waitForAuthState().then((restoredUser) => {
      console.log(
        "[AuthContext] Auth state restored from persistence:",
        restoredUser
          ? {
              uid: restoredUser.uid,
              email: restoredUser.email,
            }
          : "no user",
      );
      setUser(restoredUser);
      setLoading(false);
    });

    // Check for redirect result (from popup-blocked fallback)
    handleRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        console.log("[AuthContext] Got redirect user:", redirectUser.email);
        setUser(redirectUser);
        setLoading(false);
      }
    });

    // Subscribe to ongoing auth state changes
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      console.log(
        "[AuthContext] Auth state changed:",
        firebaseUser
          ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            }
          : null,
      );
      setUser(firebaseUser);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await signInWithTestAccount(email, password);
        // Sync user to v2 backend (creates user if not exists)
        try {
          await api.users.getCurrentUser();
          console.log("User synced to v2 backend");
        } catch (syncErr) {
          console.warn("Failed to sync user to v2 backend:", syncErr);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await firebaseSignUpWithEmail(email, password);
        // Sync user to backend (creates user if not exists)
        try {
          await api.users.getCurrentUser();
          console.log("User synced to backend");
        } catch (syncErr) {
          console.warn("Failed to sync user to backend:", syncErr);
        }
      } catch (err) {
        const errorCode = (err as { code?: string }).code;
        let message = "Sign up failed";
        if (errorCode === "auth/email-already-in-use") {
          message = "An account with this email already exists";
        } else if (errorCode === "auth/weak-password") {
          message = "Password must be at least 8 characters";
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signInWithGitHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignInWithGitHub();
      // Sync user to v2 backend (creates user if not exists)
      try {
        await api.users.getCurrentUser();
        console.log("User synced to v2 backend");
      } catch (syncErr) {
        console.warn("Failed to sync user to v2 backend:", syncErr);
        // Don't fail sign-in if sync fails - user can still use v1
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      return firebaseGetIdToken(forceRefresh);
    },
    [],
  );

  const value: AuthContextValue = {
    user,
    loading,
    isSignedIn: user !== null,
    signInWithEmail,
    signUpWithEmail,
    signInWithGitHub,
    signOut,
    getIdToken,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
