import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}

interface ContextMenuItemProps {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// Terminal icon
const TerminalIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

// Document icon
const DocumentIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

/**
 * ContextMenuItem - Individual menu item
 */
export function ContextMenuItem({
  icon,
  label,
  onClick,
  disabled = false,
}: ContextMenuItemProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm text-left
        transition-colors rounded
        ${
          disabled
            ? "text-system-400 dark:text-system-500 cursor-not-allowed"
            : "text-system-700 dark:text-system-200 hover:bg-system-100 dark:hover:bg-system-700"
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

/**
 * ContextMenu - Positioned dropdown menu
 *
 * Features:
 * - Portal rendered to body (avoid overflow issues)
 * - Positioned at cursor (x, y)
 * - Closes on click outside, Escape key, or scroll
 * - Dark mode support
 */
export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position if menu would overflow viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use mousedown to catch click before it propagates
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      onClose();
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[180px] py-1 bg-white dark:bg-system-800
        border border-system-200 dark:border-system-700 rounded-lg shadow-lg"
      data-testid="context-menu"
    >
      {children}
    </div>,
    document.body,
  );
}

// Export icons for use in menu items
export { TerminalIcon, DocumentIcon };

export default ContextMenu;
