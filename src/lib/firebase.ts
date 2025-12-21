import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithPopup,
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

  const emulatorUrl = envConfig.firebaseEmulatorUrl;
  if (emulatorUrl && !emulatorConnected) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    emulatorConnected = true;
  }

  authInitPromise = setPersistence(auth, browserLocalPersistence)
    .then(() => auth!)
    .catch(() => auth!);

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
 * Check if running in Tauri desktop app.
 */
function isTauri(): boolean {
  return "__TAURI__" in window;
}

/**
 * Sign in with GitHub OAuth.
 * Note: OAuth doesn't work in Tauri desktop app - use email/password instead.
 */
export async function signInWithGitHub(): Promise<User> {
  if (isTauri()) {
    throw new Error(
      "OAuth sign-in is not available in the desktop app. Please use email/password login.",
    );
  }

  const authInstance = getFirebaseAuth();
  const provider = new GithubAuthProvider();

  provider.addScope("read:user");
  provider.addScope("user:email");

  try {
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code;

    if (errorCode === "auth/popup-blocked") {
      throw new Error(
        "Popup was blocked. Please allow popups for this site and try again.",
      );
    }
    if (errorCode === "auth/popup-closed-by-user") {
      throw new Error("Sign-in cancelled.");
    }
    if (errorCode === "auth/unauthorized-domain") {
      throw new Error(
        "This domain is not authorized for OAuth. Add localhost to Firebase authorized domains.",
      );
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
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    return result.user;
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code;

    if (
      createIfNotExists &&
      (errorCode === "auth/user-not-found" || errorCode === "auth/invalid-credential")
    ) {
      const result = await createUserWithEmailAndPassword(authInstance, email, password);
      return result.user;
    }

    if (errorCode === "auth/wrong-password") {
      throw new Error("Incorrect password");
    }
    if (errorCode === "auth/user-not-found" || errorCode === "auth/invalid-credential") {
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
 */
export function waitForAuthState(): Promise<User | null> {
  if (authStatePromise) {
    return authStatePromise;
  }

  authStatePromise = new Promise((resolve) => {
    authStateResolver = resolve;
  });

  const authInstance = getFirebaseAuth();
  const unsubscribe = onAuthStateChanged(authInstance, (user) => {
    if (authStateResolver) {
      authStateResolver(user);
      authStateResolver = null;
    }
    unsubscribe();
  });

  return authStatePromise;
}

/**
 * Get the current user's ID token.
 * Returns null if not signed in.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const authInstance = getFirebaseAuth();
  await waitForAuthState();

  const user = authInstance.currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch {
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
