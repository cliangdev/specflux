import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Agent } from "../../api/generated/models/Agent";

export function AgentSettings() {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  // Auto-sync and load agents on mount
  const syncAndLoadAgents = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      // First sync from filesystem
      await api.agents.projectsIdAgentsSyncPost({
        id: currentProject.id,
      });

      // Then load agents
      const response = await api.agents.projectsIdAgentsGet({
        id: currentProject.id,
      });

      if (response.success && response.data) {
        setAgents(response.data);
      } else {
        setError("Failed to load agents");
      }
    } catch (err) {
      setError("Failed to load agents");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    syncAndLoadAgents();
  }, [syncAndLoadAgents]);

  const handleDeleteClick = (agent: Agent) => {
    setDeletingAgent(agent);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAgent) return;

    setError(null);

    try {
      await api.agents.agentsIdDelete({ id: deletingAgent.id });
      await syncAndLoadAgents();
      setDeletingAgent(null);
    } catch (err) {
      setError("Failed to delete agent");
      console.error(err);
      setDeletingAgent(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingAgent(null);
  };

  if (!currentProject) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          AI Agents
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure specialized Claude Code agents for different tasks
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Agents are automatically discovered from{" "}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
            .claude/agents/
          </code>{" "}
          directory. Each{" "}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
            .md
          </code>{" "}
          file becomes an agent definition.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-4xl mb-3">🤖</div>
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No agents found
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Add .md files to .claude/agents/ to define agents
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => navigate(`/settings/agents/${agent.id}`)}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* Emoji */}
                <div className="text-3xl">{agent.emoji || "🤖"}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </h3>
                    {agent.taskCount !== undefined && agent.taskCount > 0 && (
                      <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                        {agent.taskCount} tasks
                      </span>
                    )}
                  </div>
                  {agent.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                  {agent.tools && agent.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.tools.slice(0, 3).map((tool, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded"
                        >
                          {tool}
                        </span>
                      ))}
                      {agent.tools.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{agent.tools.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow indicator */}
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Agent
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{deletingAgent.name}"</span>?
              </p>
              {deletingAgent.taskCount !== undefined &&
                deletingAgent.taskCount > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    This agent is assigned to {deletingAgent.taskCount} task(s).
                    They will be unassigned.
                  </p>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
