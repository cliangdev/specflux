import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { McpServer } from "../../api/generated/models/McpServer";

export function McpServerSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingServer, setDeletingServer] = useState<McpServer | null>(null);

  // Auto-sync and load MCP servers on mount
  const syncAndLoadServers = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      // First sync from filesystem
      await api.mcpServers.projectsIdMcpServersSyncPost({
        id: currentProject.id,
      });

      // Then load servers
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
  }, [currentProject]);

  useEffect(() => {
    syncAndLoadServers();
  }, [syncAndLoadServers]);

  const handleToggle = async (server: McpServer) => {
    try {
      await api.mcpServers.mcpServersIdTogglePost({ id: server.id });
      await syncAndLoadServers();
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
      await syncAndLoadServers();
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
          MCP Servers
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Model Context Protocol servers extend Claude Code with additional
          tools
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          MCP servers are automatically discovered from{" "}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
            .claude/.mcp.json
          </code>{" "}
          file. Edit the file directly to add or modify servers.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* MCP Server Cards */}
      {servers.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-4xl mb-3">🔌</div>
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No MCP servers found
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Configure servers in .claude/.mcp.json to extend Claude Code
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                {/* Emoji */}
                <div className="text-3xl">🔌</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {server.name}
                    </h3>
                    {server.isActive ? (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                        active
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                        disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-2 truncate">
                    {server.command} {server.args.join(" ")}
                  </div>
                  {server.envVars && Object.keys(server.envVars).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.keys(server.envVars)
                        .slice(0, 3)
                        .map((key) => (
                          <span
                            key={key}
                            className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded"
                          >
                            {key}
                          </span>
                        ))}
                      {Object.keys(server.envVars).length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{Object.keys(server.envVars).length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle + Delete */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(server);
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      server.isActive
                        ? "bg-emerald-500"
                        : "bg-gray-300 dark:bg-slate-600"
                    }`}
                    title={server.isActive ? "Disable" : "Enable"}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        server.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(server);
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
