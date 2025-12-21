import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from "firebase/auth";
import { getEnvironmentConfig } from "./environment";

// Firebase configuration from environment config
// Supports runtime environment switching in development
const envConfig = getEnvironmentConfig();
const firebaseConfig = {
  apiKey: envConfig.firebaseConfig.apiKey,
  authDomain: envConfig.firebaseConfig.authDomain,
  projectId: envConfig.firebaseConfig.projectId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

/** Promise that resolves when auth is fully initialized */
let authInitPromise: Promise<Auth> | null = null;

/**
 * Initialize Firebase app and auth.
 * Connects to emulator in development mode.
 * Sets persistence to localStorage so auth survives page reloads.
 */
export function initializeFirebase(): Auth {
  if (auth) {
    return auth;
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Connect to Firebase Emulator if configured for current environment
  // Staging environment never uses emulator
  const emulatorUrl = envConfig.firebaseEmulatorUrl;
  if (emulatorUrl && !emulatorConnected) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    emulatorConnected = true;
    console.log(`Firebase Auth connected to emulator at ${emulatorUrl}`);
  }

  // Set persistence to localStorage - auth state survives page reloads
  // Firebase will automatically use refresh tokens to get new ID tokens
  authInitPromise = setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("[Firebase] Persistence set to browserLocalPersistence");
      return auth!;
    })
    .catch((error) => {
      console.error("[Firebase] Error setting persistence:", error);
      return auth!;
    });

  return auth;
}

/**
 * Wait for Firebase auth to be fully initialized with persistence.
 */
export async function waitForAuthInit(): Promise<Auth> {
  if (!authInitPromise) {
    initializeFirebase();
  }
  return authInitPromise!;
}

/**
 * Get the Firebase Auth instance.
 * Initializes if not already done.
 */
export function getFirebaseAuth(): Auth {
  return auth || initializeFirebase();
}

/**
 * Sign in with GitHub OAuth.
 * Tries popup first, falls back to redirect if popup is blocked.
 */
export async function signInWithGitHub(): Promise<User> {
  const authInstance = getFirebaseAuth();
  const provider = new GithubAuthProvider();

  // Request additional scopes if needed
  provider.addScope("read:user");
  provider.addScope("user:email");

  try {
    // Try popup first (faster UX)
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error: unknown) {
    // If popup blocked, fall back to redirect
    if (
      error instanceof Error &&
      (error.message.includes("popup-blocked") ||
        error.message.includes("popup_blocked") ||
        (error as { code?: string }).code === "auth/popup-blocked")
    ) {
      console.log("Popup blocked, using redirect flow...");
      await signInWithRedirect(authInstance, provider);
      // This won't return - page will redirect
      // Result is handled in initializeFirebase via getRedirectResult
      throw new Error("Redirecting to sign-in...");
    }
    throw error;
  }
}

/**
 * Check for redirect result on page load.
 * Call this after initializeFirebase to handle redirect sign-in completion.
 */
export async function handleRedirectResult(): Promise<User | null> {
  const authInstance = getFirebaseAuth();
  try {
    const result = await getRedirectResult(authInstance);
    return result?.user || null;
  } catch (error) {
    console.error("Redirect sign-in error:", error);
    return null;
  }
}

/**
 * Check if using Firebase Emulator.
 */
export function isUsingEmulator(): boolean {
  return envConfig.firebaseEmulatorUrl !== null;
}

/**
 * Sign in with email/password (for emulator/dev testing).
 * If createIfNotExists is true, creates the user if they don't exist.
 */
export async function signInWithTestAccount(
  email: string,
  password: string,
  createIfNotExists = true,
): Promise<User> {
  const authInstance = getFirebaseAuth();

  try {
    // Try to sign in
    const result = await signInWithEmailAndPassword(
      authInstance,
      email,
      password,
    );
    return result.user;
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code;

    // If user doesn't exist and we should create them
    if (
      createIfNotExists &&
      (errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-credential")
    ) {
      const result = await createUserWithEmailAndPassword(
        authInstance,
        email,
        password,
      );
      return result.user;
    }

    // Re-throw with clearer messages
    if (errorCode === "auth/wrong-password") {
      throw new Error("Incorrect password");
    }
    if (
      errorCode === "auth/user-not-found" ||
      errorCode === "auth/invalid-credential"
    ) {
      throw new Error("Account not found");
    }

    throw error;
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await firebaseSignOut(authInstance);
}

/** Promise that resolves when initial auth state is determined */
let authStatePromise: Promise<User | null> | null = null;
let authStateResolver: ((user: User | null) => void) | null = null;

/**
 * Wait for Firebase to restore auth state from persistence.
 * This ensures we don't make API calls before auth is ready.
 */
export function waitForAuthState(): Promise<User | null> {
  if (authStatePromise) {
    return authStatePromise;
  }

  // Create a promise that resolves on first auth state change
  authStatePromise = new Promise((resolve) => {
    authStateResolver = resolve;
  });

  // Set up one-time listener for initial auth state
  const authInstance = getFirebaseAuth();
  const unsubscribe = onAuthStateChanged(authInstance, (user) => {
    console.log(
      "[Firebase] Initial auth state resolved:",
      user ? user.email : "null",
    );
    if (authStateResolver) {
      authStateResolver(user);
      authStateResolver = null;
    }
    unsubscribe(); // Only need the first state change
  });

  return authStatePromise;
}

/**
 * Get the current user's ID token.
 * Waits for auth state to be restored first, then uses refresh token automatically.
 * Returns null if not signed in.
 *
 * @param forceRefresh - Force refresh the token even if not expired
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const authInstance = getFirebaseAuth();

  // Wait for auth state to be restored from persistence
  await waitForAuthState();

  // Always use currentUser from auth instance - not the cached promise result
  // This ensures we get the token for the CURRENT user, not a stale user
  const user = authInstance.currentUser;

  console.log(
    "[Firebase] getIdToken called, currentUser:",
    user
      ? {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
        }
      : null,
  );

  if (!user) {
    console.log("[Firebase] No current user, returning null token");
    return null;
  }

  try {
    // Firebase automatically uses refresh token to get new ID token if expired
    const token = await user.getIdToken(forceRefresh);
    console.log(
      "[Firebase] Got token:",
      token ? `${token.substring(0, 30)}...` : "null",
    );
    return token;
  } catch (err) {
    console.error("[Firebase] Error getting ID token:", err);
    return null;
  }
}

/**
 * Get the current Firebase user.
 */
export function getCurrentUser(): User | null {
  const authInstance = getFirebaseAuth();
  return authInstance.currentUser;
}

/**
 * Subscribe to auth state changes.
 *
 * @param callback - Called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (user: User | null) => void,
): () => void {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
}

/**
 * Sign up with email/password.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const authInstance = getFirebaseAuth();
  const result = await createUserWithEmailAndPassword(
    authInstance,
    email,
    password,
  );
  return result.user;
}

// Export types for convenience
export type { User, Auth };
