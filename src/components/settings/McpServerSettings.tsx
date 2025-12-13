import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readTextFile } from "@tauri-apps/plugin-fs";

// Local MCP server type for filesurface-based config
export interface LocalMcpServer {
  name: string;
  command: string;
  args: string[];
  envVars: Record<string, string>;
}

// Parse .mcp.json content into LocalMcpServer array
export function parseMcpConfig(content: string): LocalMcpServer[] {
  const config = JSON.parse(content);
  const servers: LocalMcpServer[] = [];

  if (config.mcpServers) {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const s = server as {
        command?: string;
        args?: string[];
        env?: Record<string, string>;
      };
      servers.push({
        name,
        command: s.command || "",
        args: s.args || [],
        envVars: s.env || {},
      });
    }
  }

  return servers;
}

export function McpServerSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<LocalMcpServer[]>([]);

  // Load MCP servers from filesystem (.claude/.mcp.json)
  const loadServers = useCallback(async () => {
    if (!currentProject?.localPath) return;

    setLoading(true);

    try {
      const mcpPath = `${currentProject.localPath}/.claude/.mcp.json`;
      const content = await readTextFile(mcpPath);
      setServers(parseMcpConfig(content));
    } catch {
      // File doesn't exist - show empty state
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

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
              key={server.name}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                {/* Emoji */}
                <div className="text-3xl">🔌</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {server.name}
                  </h3>
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
                            className="text-xs bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 px-2 py-0.5 rounded"
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
