/**
 * OAuth for Tauri Desktop App
 *
 * Uses tauri-plugin-oauth to handle OAuth flows by starting a local HTTP server,
 * opening the OAuth URL in the system browser, and capturing the callback.
 */

import { start, cancel, onUrl } from "@fabianlars/tauri-plugin-oauth";
import { open } from "@tauri-apps/plugin-shell";

const OAUTH_CONFIG = {
  ports: [8765, 8766, 8767, 8768, 8769],
  timeoutMs: 60 * 1000,
  response: `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container { text-align: center; padding: 2rem; }
          .success { color: #22c55e; font-size: 3rem; margin-bottom: 1rem; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h2>Login Successful</h2>
          <p>You can close this tab and return to SpecFlux.</p>
          <p><small>This tab will close automatically...</small></p>
        </div>
        <script>setTimeout(() => window.close(), 1500);</script>
      </body>
    </html>
  `,
};

export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "cancelled" | "server_error" | "invalid_response",
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

const GOOGLE_OAUTH_CONFIG = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  scope: "email profile openid",
};

/**
 * Start Google OAuth flow in desktop app.
 * Opens system browser, waits for callback, returns access token.
 */
export async function startGoogleOAuth(clientId: string): Promise<string> {
  return startOAuthFlow(clientId, GOOGLE_OAUTH_CONFIG);
}

async function startOAuthFlow(
  clientId: string,
  config: { authUrl: string; scope: string },
): Promise<string> {
  let port: number | null = null;
  let unsubscribe: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    try {
      port = await start({ ports: OAUTH_CONFIG.ports, response: OAUTH_CONFIG.response });
    } catch (err) {
      console.error("[OAuth] Failed to start server:", err);
      throw new OAuthError(
        "Could not start login server. Please restart the app and try again.",
        "server_error",
      );
    }

    const redirectUri = `http://localhost:${port}`;
    const authUrl = buildOAuthUrl(config, clientId, redirectUri);

    const tokenPromise = new Promise<string>((resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new OAuthError("Login timed out. Please try again.", "timeout"));
      }, OAUTH_CONFIG.timeoutMs);

      onUrl(async (url: string) => {
        try {
          const token = extractAccessToken(url);
          if (token) {
            resolve(token);
          } else {
            reject(new OAuthError("Login failed. Please try again.", "invalid_response"));
          }
        } catch {
          reject(new OAuthError("Login failed. Please try again.", "invalid_response"));
        }
      }).then((unsub: () => void) => {
        unsubscribe = unsub;
      });
    });

    await open(authUrl);
    return await tokenPromise;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (unsubscribe) (unsubscribe as () => void)();
    if (port) {
      try {
        await cancel(port);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

function buildOAuthUrl(
  config: { authUrl: string; scope: string },
  clientId: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    response_type: "token",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    prompt: "select_account",
  });
  return `${config.authUrl}?${params.toString()}`;
}

function extractAccessToken(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    return hashParams.get("access_token");
  } catch {
    return null;
  }
}

/**
 * Check if running in Tauri desktop app.
 */
export function isTauri(): boolean {
  return (
    ("isTauri" in window && !!(window as unknown as { isTauri: boolean }).isTauri) ||
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window
  );
}
