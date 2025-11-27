import { useState, useEffect, useRef } from "react";
import type { Agent } from "../../api/generated";
import { api } from "../../api";

interface AgentSelectorProps {
  projectId: number;
  selectedAgentId?: number | null;
  onChange: (agentId: number | null, agent: Agent | null) => void;
  disabled?: boolean;
  /** Show inline (compact) or full dropdown */
  variant?: "inline" | "dropdown";
}

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

export default function AgentSelector({
  projectId,
  selectedAgentId,
  onChange,
  disabled = false,
  variant = "dropdown",
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch agents for the project
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await api.agents.projectsIdAgentsGet({
          id: projectId,
        });
        setAgents(response.data ?? []);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, [projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleSelect = (agent: Agent | null) => {
    onChange(agent?.id ?? null, agent);
    setIsOpen(false);
  };

  if (variant === "inline") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors ${
            selectedAgent
              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/50"
              : "bg-system-100 text-system-600 dark:bg-system-800 dark:text-system-400 hover:bg-system-200 dark:hover:bg-system-700"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {selectedAgent ? (
            <>
              <span>{selectedAgent.emoji}</span>
              <span className="font-medium">{selectedAgent.name}</span>
            </>
          ) : (
            <>
              <AgentIcon className="w-3.5 h-3.5" />
              <span className="italic">No agent</span>
            </>
          )}
          <svg
            className="w-3.5 h-3.5 ml-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1">
            {loading ? (
              <div className="px-3 py-2 text-sm text-system-500 dark:text-system-400">
                Loading agents...
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                    !selectedAgentId ? "bg-system-100 dark:bg-system-700" : ""
                  }`}
                >
                  <AgentIcon className="w-4 h-4 text-system-400" />
                  <span className="text-system-500 dark:text-system-400 italic">
                    No agent assigned
                  </span>
                  {!selectedAgentId && (
                    <svg
                      className="w-4 h-4 ml-auto text-brand-600 dark:text-brand-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                {agents.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-system-500 dark:text-system-400">
                    No agents configured
                  </div>
                ) : (
                  agents.map((agent) => {
                    const isSelected = agent.id === selectedAgentId;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleSelect(agent)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                          isSelected ? "bg-system-100 dark:bg-system-700" : ""
                        }`}
                      >
                        <span className="text-lg">{agent.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium truncate ${
                              isSelected
                                ? "text-brand-600 dark:text-brand-400"
                                : "text-system-900 dark:text-white"
                            }`}
                          >
                            {agent.name}
                          </div>
                          {agent.description && (
                            <div className="text-xs text-system-500 dark:text-system-400 truncate">
                              {agent.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 ml-auto text-brand-600 dark:text-brand-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full dropdown variant (for forms)
  return (
    <div>
      <select
        value={selectedAgentId ?? ""}
        onChange={(e) => {
          const agentId = e.target.value ? Number(e.target.value) : null;
          const agent = agents.find((a) => a.id === agentId) ?? null;
          onChange(agentId, agent);
        }}
        disabled={disabled || loading}
        className="select"
      >
        <option value="">No agent assigned</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.emoji} {agent.name}
          </option>
        ))}
      </select>
    </div>
  );
}
