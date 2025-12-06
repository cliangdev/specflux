import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

// Local agent type for filesystem-based agents
export interface LocalAgent {
  id: string;
  name: string;
  description?: string;
  filePath: string;
}

// Extract description from markdown content (first non-heading, non-empty line)
export function extractDescription(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      return trimmed;
    }
  }
  return "";
}

export function AgentSettings() {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<LocalAgent[]>([]);

  // Load agents from filesystem (.claude/agents/*.md)
  const loadAgents = useCallback(async () => {
    if (!currentProject?.localPath) return;

    setLoading(true);

    try {
      const agentsDir = `${currentProject.localPath}/.claude/agents`;
      const entries = await readDir(agentsDir);
      const loadedAgents: LocalAgent[] = [];

      for (const entry of entries) {
        if (entry.name?.endsWith(".md")) {
          try {
            const content = await readTextFile(`${agentsDir}/${entry.name}`);
            const name = entry.name.replace(".md", "");
            loadedAgents.push({
              id: name,
              name,
              description: extractDescription(content),
              filePath: `.claude/agents/${entry.name}`,
            });
          } catch (err) {
            console.warn(`Failed to read agent file ${entry.name}:`, err);
          }
        }
      }

      setAgents(loadedAgents);
    } catch {
      // Directory doesn't exist - show empty state (not an error)
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

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
                <div className="text-3xl">🤖</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-2">
                    {agent.filePath}
                  </div>
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
    </div>
  );
}
