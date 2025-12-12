import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { AgentDefinitionTab } from "../components/agents";
import { useProject } from "../contexts/ProjectContext";
import { extractDescription } from "../components/settings/AgentSettings";

type TabId = "overview" | "definition";

// Local agent type for filesystem-based agents
interface LocalAgent {
  id: string;
  name: string;
  description: string;
  filePath: string;
  content: string;
}

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
  const [agent, setAgent] = useState<LocalAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    emoji: "",
    content: "",
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
    if (!id || !currentProject?.localPath) return;

    try {
      setLoading(true);
      setError(null);

      const filePath = `.claude/agents/${id}.md`;
      const fullPath = `${currentProject.localPath}/${filePath}`;
      const content = await readTextFile(fullPath);

      const agentData: LocalAgent = {
        id,
        name: id,
        description: extractDescription(content),
        filePath,
        content,
      };
      setAgent(agentData);

      // Initialize edit form with current values
      setEditForm({
        name: agentData.name,
        description: agentData.description,
        emoji: "🤖",
        content: agentData.content,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agent";
      setError(`Agent not found: ${id}`);
      console.error("Failed to fetch agent:", err);
    } finally {
      setLoading(false);
    }
  }, [id, currentProject?.localPath]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleEditClick = () => {
    if (agent) {
      setEditForm({
        name: agent.name,
        description: agent.description || "",
        emoji: "🤖",
        content: agent.content,
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
    if (!agent || !id || !currentProject?.localPath) return;

    setSaving(true);
    setSaveError(null);

    try {
      const fullPath = `${currentProject.localPath}/${agent.filePath}`;
      await writeTextFile(fullPath, editForm.content);

      await fetchAgent();
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save agent";
      setSaveError(message);
      console.error("Failed to save agent:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // Note: File deletion not implemented - would need to use Tauri fs remove
    // For now, just navigate back
    setShowDeleteConfirm(false);
    navigate("/settings?tab=agents");
  };

  const handleEmojiSelect = (emoji: string) => {
    setEditForm({ ...editForm, emoji });
    setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin w-8 h-8 text-accent-500"
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
        <p className="text-surface-500 mt-2">{error}</p>
        <button onClick={fetchAgent} className="mt-4 btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <div className="text-surface-500 dark:text-surface-400 text-lg">
          Agent not found
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 btn btn-primary">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <Link
          to="/settings?tab=agents"
          className="inline-flex items-center gap-1.5 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
        <span className="text-4xl">🤖</span>
        <h1 className="text-xl font-semibold text-surface-900 dark:text-white flex-1 truncate">
          {agent.name}
        </h1>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn btn-danger"
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

      {/* Tabs */}
      <div className="border-b border-surface-200 dark:border-surface-700 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-accent-500 text-accent-600 dark:text-accent-400"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("definition")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "definition"
                ? "border-accent-500 text-accent-600 dark:text-accent-400"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
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
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
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
              <p className="text-surface-700 dark:text-surface-300">
                {agent.description || (
                  <span className="text-surface-400 dark:text-surface-500 italic">
                    No description
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Source File */}
          {agent.filePath && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
                Source File
              </h3>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded font-mono text-surface-700 dark:text-surface-300">
                  {agent.filePath}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(agent.filePath || "")
                  }
                  className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
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

        </div>
      )}

      {activeTab === "definition" && (
        <AgentDefinitionTab
          configFilePath={agent.filePath}
          projectPath={currentProject?.localPath}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Delete Agent
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{agent.name}"</span>?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 flex gap-3 justify-end">
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
