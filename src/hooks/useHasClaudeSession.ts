import { useState, useEffect } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLocalProjectPath } from "./useLocalProjectPath";
import {
  getClaudeSessionId,
  buildContextKey,
} from "../services/claudeSessionStore";
import { sessionExists } from "../services/claudeSessionDetector";

/**
 * Hook to check if a Claude session exists for a given context.
 * Checks both the stored session ID and validates it exists in Claude's storage.
 *
 * @param contextType - The type of context (task, epic, prd, release)
 * @param contextId - The ID of the context
 * @returns true if a valid Claude session exists
 */
export function useHasClaudeSession(
  contextType: string,
  contextId: string | undefined
): boolean {
  const { currentProject } = useProject();
  const { localPath } = useLocalProjectPath();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!localPath || !contextId) {
        setHasSession(false);
        return;
      }

      try {
        const contextKey = buildContextKey(contextType, contextId);
        const sessionId = await getClaudeSessionId(
          localPath,
          contextKey
        );

        if (sessionId && !cancelled) {
          const exists = await sessionExists(localPath, sessionId);
          if (!cancelled) {
            setHasSession(exists);
          }
        } else if (!cancelled) {
          setHasSession(false);
        }
      } catch (error) {
        console.warn("Failed to check Claude session:", error);
        if (!cancelled) {
          setHasSession(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [localPath, contextType, contextId]);

  return hasSession;
}
