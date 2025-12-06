import type { User } from "../../api/generated";

interface OwnerExecutorBadgeProps {
  /** Owner user object (for avatar/name display) */
  owner?: User | null;
  /** Owner user ID (fallback if user object not available) */
  ownerUserId?: string | null;
  /** Executor type: 'human' or 'agent' */
  executorType?: "human" | "agent";
  /** Agent name for display when executor is agent */
  agentName?: string | null;
  /** Assigned user for human executor */
  assignedUser?: User | null;
  /** Show labels (Owner:, Executor:) or just icons */
  showLabels?: boolean;
}

// User icon (person silhouette)
const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

// Robot/Agent icon
const AgentIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

// Simple avatar with initials
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = size === "sm" ? "w-5 h-5 text-xs" : "w-6 h-6 text-sm";

  return (
    <div
      className={`${sizeClasses} rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center font-medium`}
    >
      {initials}
    </div>
  );
}

export default function OwnerExecutorBadge({
  owner,
  ownerUserId,
  executorType,
  agentName,
  assignedUser,
  showLabels = true,
}: OwnerExecutorBadgeProps) {
  const hasOwner = owner || ownerUserId;
  const ownerName =
    owner?.displayName ||
    owner?.email ||
    (ownerUserId ? `User ${ownerUserId}` : null);

  const isAgentExecutor = executorType === "agent";
  const executorName = isAgentExecutor
    ? agentName || "AI Agent"
    : assignedUser?.displayName || assignedUser?.email || "Unassigned";

  // Format agent name for display (e.g., "backend-dev" -> "Backend Dev")
  const formatAgentName = (name: string) => {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Owner */}
      <div className="flex items-center gap-1.5">
        {showLabels && (
          <span className="text-system-500 dark:text-system-400">Owner:</span>
        )}
        {hasOwner ? (
          <div className="flex items-center gap-1">
            {owner ? (
              <Avatar name={owner.displayName || owner.email || ""} />
            ) : (
              <UserIcon className="w-4 h-4 text-system-500 dark:text-system-400" />
            )}
            <span className="text-system-700 dark:text-system-200">
              {ownerName}
            </span>
          </div>
        ) : (
          <span className="text-system-400 dark:text-system-500 italic">
            Unassigned
          </span>
        )}
      </div>

      {/* Separator */}
      <span className="text-system-300 dark:text-system-600">|</span>

      {/* Executor */}
      <div className="flex items-center gap-1.5">
        {showLabels && (
          <span className="text-system-500 dark:text-system-400">
            Executor:
          </span>
        )}
        <div className="flex items-center gap-1">
          {isAgentExecutor ? (
            <>
              <AgentIcon className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              <span className="text-brand-600 dark:text-brand-400 font-medium">
                {formatAgentName(executorName)}
              </span>
            </>
          ) : assignedUser ? (
            <>
              <Avatar
                name={assignedUser.displayName || assignedUser.email || ""}
              />
              <span className="text-system-700 dark:text-system-200">
                {executorName}
              </span>
            </>
          ) : (
            <>
              <UserIcon className="w-4 h-4 text-system-400 dark:text-system-500" />
              <span className="text-system-400 dark:text-system-500 italic">
                Unassigned
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
