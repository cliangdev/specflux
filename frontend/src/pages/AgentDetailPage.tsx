import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../api";
import type { Agent } from "../api/generated/models/Agent";
import { AgentDefinitionTab } from "../components/agents";
import { useProject } from "../contexts/ProjectContext";

type TabId = "overview" | "definition";

// Common emoji options for picker
const EMOJI_OPTIONS = [
  "🤖",
  "👨‍💻",
  "👩‍💻",
  "🔧",
  "🎨",
  "📊",
  "🔍",
  "📝",
  "🧪",
  "🚀",
  "💻",
  "🛠️",
  "📱",
  "🌐",
  "🔒",
  "📁",
  "⚡",
  "🎯",
  "💡",
  "🧠",
];

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // Data state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    emoji: "",
    systemPrompt: "",
    tools: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.agents.agentsIdGet({ id: parseInt(id, 10) });
      const agentData = response.data ?? null;
      setAgent(agentData);

      // Initialize edit form with current values
      if (agentData) {
        setEditForm({
          name: agentData.name,
          description: agentData.description || "",
          emoji: agentData.emoji || "🤖",
          systemPrompt: agentData.systemPrompt || "",
          tools: agentData.tools || [],
        });
      }
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to load agent");
      setError(message);
      console.error("Failed to fetch agent:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleEditClick = () => {
    if (agent) {
      setEditForm({
        name: agent.name,
        description: agent.description || "",
        emoji: agent.emoji || "🤖",
        systemPrompt: agent.systemPrompt || "",
        tools: agent.tools || [],
      });
    }
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    setShowEmojiPicker(false);
  };

  const handleSave = async () => {
    if (!agent || !id) return;

    setSaving(true);
    setSaveError(null);

    try {
      const response = await api.agents.agentsIdPut({
        id: parseInt(id, 10),
        updateAgentRequest: {
          name: editForm.name,
          description: editForm.description || null,
          emoji: editForm.emoji || undefined,
          systemPrompt: editForm.systemPrompt || null,
          tools: editForm.tools.length > 0 ? editForm.tools : null,
        },
      });

      if (response.success) {
        await fetchAgent();
        setIsEditing(false);
      } else {
        setSaveError("Failed to save agent");
      }
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to save agent");
      setSaveError(message);
      console.error("Failed to save agent:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);

    try {
      await api.agents.agentsIdDelete({ id: parseInt(id, 10) });
      navigate(-1);
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to delete agent");
      setError(message);
      console.error("Failed to delete agent:", err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setEditForm({ ...editForm, emoji });
    setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin w-8 h-8 text-brand-500"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 text-lg">
          Error loading agent
        </div>
        <p className="text-system-500 mt-2">{error}</p>
        <button onClick={fetchAgent} className="mt-4 btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          Agent not found
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 btn btn-primary">
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-ghost">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn btn-ghost text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
          {saveError}
        </div>
      )}

      {/* Agent Header - Emoji and Name */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          {isEditing ? (
            <>
              {/* Emoji Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-16 h-16 text-4xl flex items-center justify-center border-2 border-dashed border-system-300 dark:border-system-600 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors"
                >
                  {editForm.emoji || "🤖"}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-system-800 border border-system-200 dark:border-system-700 rounded-lg shadow-lg z-10 grid grid-cols-5 gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="w-8 h-8 text-xl hover:bg-system-100 dark:hover:bg-system-700 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Name Input */}
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="text-2xl font-semibold bg-transparent border-b-2 border-system-300 dark:border-system-600 focus:border-brand-500 dark:focus:border-brand-400 outline-none text-system-900 dark:text-white px-1"
                placeholder="Agent name"
              />
            </>
          ) : (
            <>
              <span className="text-5xl">{agent.emoji || "🤖"}</span>
              <h1 className="text-2xl font-semibold text-system-900 dark:text-white">
                {agent.name}
              </h1>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-system-200 dark:border-system-700 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-system-500 hover:text-system-700 dark:hover:text-system-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("definition")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "definition"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-system-500 hover:text-system-700 dark:hover:text-system-300"
            }`}
          >
            Agent Definition
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Overview Edit Controls */}
          <div className="flex justify-end mb-4">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editForm.name.trim()}
                  className="btn btn-primary text-sm"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditClick}
                className="btn btn-secondary text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            )}
          </div>

          {/* Description */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-system-500 dark:text-system-400 mb-2">
              Description
            </h3>
            {isEditing ? (
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={3}
                className="w-full input resize-none"
                placeholder="Describe what this agent specializes in..."
              />
            ) : (
              <p className="text-system-700 dark:text-system-300">
                {agent.description || (
                  <span className="text-system-400 dark:text-system-500 italic">
                    No description
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Source File */}
          {agent.configFilePath && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-system-500 dark:text-system-400 mb-2">
                Source File
              </h3>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-system-100 dark:bg-system-800 px-2 py-1 rounded font-mono text-system-700 dark:text-system-300">
                  {agent.configFilePath}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(agent.configFilePath || "")
                  }
                  className="p-1 text-system-400 hover:text-system-600 dark:hover:text-system-300"
                  title="Copy path"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Tools */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-system-500 dark:text-system-400 mb-2">
              Allowed Tools
            </h3>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editForm.tools.join(", ")}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      tools: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full input"
                  placeholder="Read, Edit, Bash, Glob, Grep (comma-separated)"
                />
                <p className="text-xs text-system-500 dark:text-system-400 mt-1">
                  Leave empty to allow all tools
                </p>
              </div>
            ) : agent.tools && agent.tools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agent.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-sm bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-system-500 dark:text-system-400">
                All tools allowed
              </p>
            )}
          </div>

          {/* Timestamps */}
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-system-500 dark:text-system-400">
                  Created:
                </span>
                <span className="ml-2 text-system-700 dark:text-system-300">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-system-500 dark:text-system-400">
                  Updated:
                </span>
                <span className="ml-2 text-system-700 dark:text-system-300">
                  {new Date(agent.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "definition" && (
        <AgentDefinitionTab
          configFilePath={agent.configFilePath}
          projectPath={currentProject?.localPath}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-system-200 dark:border-system-700">
              <h3 className="text-lg font-semibold text-system-900 dark:text-white">
                Delete Agent
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-system-700 dark:text-system-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{agent.name}"</span>?
              </p>
              {agent.taskCount !== undefined && agent.taskCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  This agent is assigned to {agent.taskCount} task(s). They will
                  be unassigned.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-system-200 dark:border-system-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Deleting..." : "Delete Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
