import { useEffect } from "react";
import { useTerminal, type PageContext } from "../contexts/TerminalContext";

/**
 * Hook to set page context for terminal suggested commands.
 * The context is automatically cleared when the component unmounts.
 *
 * @param context - The page context to set, or null to clear
 *
 * @example
 * // In PRDsPage:
 * usePageContext({ type: "prds" });
 *
 * @example
 * // In EpicDetailPage:
 * usePageContext({ type: "epic-detail", id: epic.id, title: epic.title });
 */
export function usePageContext(context: PageContext | null) {
  const { setPageContext } = useTerminal();

  useEffect(() => {
    setPageContext(context);
    return () => setPageContext(null);
  }, [
    context?.type,
    context?.id,
    context?.title,
    setPageContext,
  ]);
}
