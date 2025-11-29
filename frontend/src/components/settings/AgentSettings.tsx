import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Agent } from "../../api/generated/models/Agent";

interface AgentFormData {
  name: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  tools: string[];
}

type ModalMode = "add" | "edit" | null;

export function AgentSettings() {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    emoji: "",
    systemPrompt: "",
    tools: [],
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    deleted: number;
  } | null>(null);

  // Load agents
  useEffect(() => {
    if (currentProject) {
      loadAgents();
    }
  }, [currentProject]);

  const loadAgents = async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
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
  };

  const handleAddClick = () => {
    setFormData({
      name: "",
      description: "",
      emoji: "",
      systemPrompt: "",
      tools: [],
    });
    setEditingAgent(null);
    setModalMode("add");
  };

  const handleEditClick = (agent: Agent) => {
    setFormData({
      name: agent.name,
      description: agent.description || "",
      emoji: agent.emoji || "",
      systemPrompt: agent.systemPrompt || "",
      tools: agent.tools || [],
    });
    setEditingAgent(agent);
    setModalMode("edit");
  };

  const handleModalClose = () => {
    setModalMode(null);
    setEditingAgent(null);
    setFormData({
      name: "",
      description: "",
      emoji: "",
      systemPrompt: "",
      tools: [],
    });
  };

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);

    try {
      if (modalMode === "add") {
        const response = await api.agents.projectsIdAgentsPost({
          id: currentProject.id,
          createAgentRequest: {
            name: formData.name,
            description: formData.description || null,
            emoji: formData.emoji || undefined,
            systemPrompt: formData.systemPrompt || null,
            tools: formData.tools.length > 0 ? formData.tools : null,
          },
        });

        if (response.success) {
          await loadAgents();
          handleModalClose();
        } else {
          setError("Failed to add agent");
        }
      } else if (modalMode === "edit" && editingAgent) {
        const response = await api.agents.agentsIdPut({
          id: editingAgent.id,
          updateAgentRequest: {
            name: formData.name,
            description: formData.description || null,
            emoji: formData.emoji || undefined,
            systemPrompt: formData.systemPrompt || null,
            tools: formData.tools.length > 0 ? formData.tools : null,
          },
        });

        if (response.success) {
          await loadAgents();
          handleModalClose();
        } else {
          setError("Failed to update agent");
        }
      }
    } catch (err) {
      setError(
        modalMode === "add" ? "Failed to add agent" : "Failed to update agent",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (agent: Agent) => {
    setDeletingAgent(agent);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAgent) return;

    setError(null);

    try {
      await api.agents.agentsIdDelete({ id: deletingAgent.id });
      await loadAgents();
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

  const handleSync = async () => {
    if (!currentProject) return;

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await api.agents.projectsIdAgentsSyncPost({
        id: currentProject.id,
      });

      if (response.success && response.data) {
        setSyncResult(
          response.data as {
            created: number;
            updated: number;
            deleted: number;
          },
        );
        await loadAgents();
      } else {
        setError("Failed to sync agents from filesystem");
      }
    } catch (err) {
      setError("Failed to sync agents from filesystem");
      console.error(err);
    } finally {
      setSyncing(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            AI Agents
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure specialized Claude Code agents for different tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
            title="Sync agents from .claude/agents/ directory"
          >
            {syncing ? "Syncing..." : "Sync from Filesystem"}
          </button>
          <button
            onClick={handleAddClick}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
          >
            Create Agent
          </button>
        </div>
      </div>

      {/* Sync result message */}
      {syncResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
          Synced from .claude/agents/: {syncResult.created} created,{" "}
          {syncResult.updated} updated, {syncResult.deleted} deleted
        </div>
      )}

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
            No agents configured yet
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Create an agent to customize Claude Code for specific tasks
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

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(agent);
                    }}
                    className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Quick Edit"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(agent);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Delete"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Create Agent" : "Edit Agent"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    className="w-16 h-16 text-3xl text-center border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    placeholder="🤖"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    placeholder="e.g., Backend Developer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  placeholder="Brief description of this agent's specialty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                  placeholder="Custom instructions for Claude Code..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Allowed Tools (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tools.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tools: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  placeholder="Read, Edit, Bash, Glob, Grep"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to allow all tools
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={handleModalClose}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                {saving
                  ? "Saving..."
                  : modalMode === "add"
                    ? "Create Agent"
                    : "Save Changes"}
              </button>
            </div>
          </div>
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
