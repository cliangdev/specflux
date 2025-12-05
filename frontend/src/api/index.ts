/**
 * API Module
 *
 * Provides the unified API client for the Spring Boot backend.
 * Uses Firebase JWT authentication.
 */

// Main API client
export { api } from "./client";

// Re-export all generated types, enums, and APIs
// This includes: Project, Task, Epic, Release, Repository, Skill, Agent, McpServer, etc.
// As well as all status enums: TaskStatus, EpicStatus, ReleaseStatus, etc.
export * from "./generated/models";
export * from "./generated/apis";

// Runtime error class (for error handling)
export { ResponseError } from "./generated/runtime";

// Re-export Configuration from runtime
export { Configuration } from "./generated/runtime";

/**
 * Extract a user-friendly error message from an API error.
 * Handles ResponseError from the generated client which wraps fetch Response objects.
 *
 * @param error - The error caught from an API call
 * @param fallback - Fallback message if error cannot be parsed
 * @returns A user-friendly error message
 */
export async function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
): Promise<string> {
  const { ResponseError } = await import("./generated/runtime");

  if (error instanceof ResponseError) {
    try {
      const body = await error.response.clone().json();
      if (body && typeof body.error === "string") {
        return body.error;
      }
    } catch {
      // If we can't parse the response, fall through to default handling
    }
    return error.response.statusText || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
