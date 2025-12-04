/**
 * v2 Response Adapter
 *
 * Converts v2 (Spring Boot) API responses to v1 format for component compatibility.
 *
 * v1 format: { success: boolean, data?: T, error?: string }
 * v2 format: T (direct object) or throws error with { error, code, details }
 */

import type { ResponseError } from "../v2/generated/runtime";

/**
 * v1 API response format used by frontend components.
 */
export interface V1Response<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * v2 error response format from Spring Boot backend.
 */
export interface V2ErrorResponse {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Extract error message from v2 error response.
 */
async function extractErrorMessage(error: unknown): Promise<string> {
  // Handle fetch ResponseError from generated client
  if (error && typeof error === "object" && "response" in error) {
    const responseError = error as ResponseError;
    try {
      const body = await responseError.response.json();
      if (body && typeof body.error === "string") {
        // Include field errors if present
        if (Array.isArray(body.details) && body.details.length > 0) {
          const fieldErrors = body.details
            .map(
              (d: { field: string; message: string }) =>
                `${d.field}: ${d.message}`,
            )
            .join(", ");
          return `${body.error} (${fieldErrors})`;
        }
        return body.error;
      }
    } catch {
      // If we can't parse the body, use status text
      return responseError.response.statusText || "Request failed";
    }
  }

  // Handle standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return String(error) || "An unexpected error occurred";
}

/**
 * Wrap a v2 API promise to return v1 response format.
 *
 * Usage:
 * ```typescript
 * const response = await wrapV2Response(v2Api.projects.listProjects());
 * if (response.success) {
 *   console.log(response.data);
 * } else {
 *   console.error(response.error);
 * }
 * ```
 */
export async function wrapV2Response<T>(
  promise: Promise<T>,
): Promise<V1Response<T>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    const message = await extractErrorMessage(error);
    return { success: false, error: message };
  }
}

/**
 * Wrap a v2 API call that returns void (e.g., DELETE).
 */
export async function wrapV2VoidResponse(
  promise: Promise<void>,
): Promise<V1Response<void>> {
  try {
    await promise;
    return { success: true };
  } catch (error) {
    const message = await extractErrorMessage(error);
    return { success: false, error: message };
  }
}

/**
 * Transform v2 paginated response to v1 format.
 * v2 uses cursor-based pagination, v1 uses offset-based.
 * This adapter preserves the cursor info for components that support it.
 */
export interface V1PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasMore?: boolean;
    total?: number;
  };
  error?: string;
}

/**
 * Wrap a v2 paginated API response.
 */
export async function wrapV2PaginatedResponse<
  TResponse extends { data?: TItem[]; pagination?: unknown },
  TItem,
>(promise: Promise<TResponse>): Promise<V1PaginatedResponse<TItem>> {
  try {
    const response = await promise;
    return {
      success: true,
      data: response.data,
      pagination:
        response.pagination as V1PaginatedResponse<TItem>["pagination"],
    };
  } catch (error) {
    const message = await extractErrorMessage(error);
    return { success: false, error: message };
  }
}
