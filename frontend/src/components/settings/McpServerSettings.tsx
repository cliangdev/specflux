import { useState, useEffect } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { McpServer } from "../../api/generated/models/McpServer";

interface McpServerFormData {
  name: string;
  command: string;
  args: string;
  envVars: string;
  isActive: boolean;
}

type ModalMode = "add" | "edit" | null;

export function McpServerSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [deletingServer, setDeletingServer] = useState<McpServer | null>(null);
  const [formData, setFormData] = useState<McpServerFormData>({
    name: "",
    command: "",
    args: "",
    envVars: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    deleted: number;
  } | null>(null);

  // Load MCP servers
  useEffect(() => {
    if (currentProject) {
      loadServers();
    }
  }, [currentProject]);

  const loadServers = async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.mcpServers.projectsIdMcpServersGet({
        id: currentProject.id,
      });

      if (response.success && response.data) {
        setServers(response.data);
      } else {
        setError("Failed to load MCP servers");
      }
    } catch (err) {
      setError("Failed to load MCP servers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setFormData({
      name: "",
      command: "npx",
      args: "-y @modelcontextprotocol/server-",
      envVars: "",
      isActive: true,
    });
    setEditingServer(null);
    setModalMode("add");
  };

  const handleEditClick = (server: McpServer) => {
    setFormData({
      name: server.name,
      command: server.command,
      args: server.args.join(" "),
      envVars: server.envVars
        ? Object.entries(server.envVars)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n")
        : "",
      isActive: server.isActive,
    });
    setEditingServer(server);
    setModalMode("edit");
  };

  const handleModalClose = () => {
    setModalMode(null);
    setEditingServer(null);
    setFormData({
      name: "",
      command: "",
      args: "",
      envVars: "",
      isActive: true,
    });
  };

  const parseEnvVars = (str: string): Record<string, string> | null => {
    if (!str.trim()) return null;
    const result: Record<string, string> = {};
    str.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join("=").trim();
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  };

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);

    try {
      const args = formData.args.split(/\s+/).filter(Boolean);
      const envVars = parseEnvVars(formData.envVars);

      if (modalMode === "add") {
        const response = await api.mcpServers.projectsIdMcpServersPost({
          id: currentProject.id,
          createMcpServerRequest: {
            name: formData.name,
            command: formData.command,
            args,
            envVars,
            isActive: formData.isActive,
          },
        });

        if (response.success) {
          await loadServers();
          handleModalClose();
        } else {
          setError("Failed to add MCP server");
        }
      } else if (modalMode === "edit" && editingServer) {
        const response = await api.mcpServers.mcpServersIdPut({
          id: editingServer.id,
          updateMcpServerRequest: {
            name: formData.name,
            command: formData.command,
            args,
            envVars,
            isActive: formData.isActive,
          },
        });

        if (response.success) {
          await loadServers();
          handleModalClose();
        } else {
          setError("Failed to update MCP server");
        }
      }
    } catch (err) {
      setError(
        modalMode === "add"
          ? "Failed to add MCP server"
          : "Failed to update MCP server",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (server: McpServer) => {
    try {
      await api.mcpServers.mcpServersIdTogglePost({ id: server.id });
      await loadServers();
    } catch (err) {
      setError("Failed to toggle MCP server");
      console.error(err);
    }
  };

  const handleDeleteClick = (server: McpServer) => {
    setDeletingServer(server);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingServer) return;

    setError(null);

    try {
      await api.mcpServers.mcpServersIdDelete({ id: deletingServer.id });
      await loadServers();
      setDeletingServer(null);
    } catch (err) {
      setError("Failed to delete MCP server");
      console.error(err);
      setDeletingServer(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingServer(null);
  };

  const handleSync = async () => {
    if (!currentProject) return;

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await api.mcpServers.projectsIdMcpServersSyncPost({
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
        await loadServers();
      } else {
        setError("Failed to sync MCP servers from filesystem");
      }
    } catch (err) {
      setError("Failed to sync MCP servers from filesystem");
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
            MCP Servers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Model Context Protocol servers extend Claude Code with additional
            tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
            title="Sync from .claude/.mcp.json file"
          >
            {syncing ? "Syncing..." : "Sync from Filesystem"}
          </button>
          <button
            onClick={handleAddClick}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
          >
            Add Server
          </button>
        </div>
      </div>

      {/* Sync result message */}
      {syncResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
          Synced from .claude/.mcp.json: {syncResult.created} created,{" "}
          {syncResult.updated} updated, {syncResult.deleted} deleted
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* MCP Servers List */}
      {servers.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-4xl mb-3">🔌</div>
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No MCP servers configured
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Add MCP servers to extend Claude Code with additional capabilities
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`border rounded-lg p-4 ${
                server.isActive
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(server)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    server.isActive
                      ? "bg-emerald-500"
                      : "bg-gray-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      server.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {server.name}
                    </h3>
                    {!server.isActive && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (disabled)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                    {server.command} {server.args.join(" ")}
                  </div>
                  {server.envVars && Object.keys(server.envVars).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.keys(server.envVars).map((key) => (
                        <span
                          key={key}
                          className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditClick(server)}
                    className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Edit"
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
                    onClick={() => handleDeleteClick(server)}
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
                {modalMode === "add" ? "Add MCP Server" : "Edit MCP Server"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
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
                  placeholder="e.g., github"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Command
                </label>
                <input
                  type="text"
                  value={formData.command}
                  onChange={(e) =>
                    setFormData({ ...formData, command: e.target.value })
                  }
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                  placeholder="npx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Arguments
                </label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={(e) =>
                    setFormData({ ...formData, args: e.target.value })
                  }
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                  placeholder="-y @modelcontextprotocol/server-github"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Environment Variables
                </label>
                <textarea
                  value={formData.envVars}
                  onChange={(e) =>
                    setFormData({ ...formData, envVars: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono resize-none"
                  placeholder="GITHUB_TOKEN=ghp_xxx&#10;API_KEY=xxx"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  One per line in KEY=VALUE format
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Enable this server
                </label>
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
                disabled={saving || !formData.name || !formData.command}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                {saving
                  ? "Saving..."
                  : modalMode === "add"
                    ? "Add Server"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete MCP Server
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{deletingServer.name}"</span>?
              </p>
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
                Delete Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
