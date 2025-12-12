import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

// Local agent type for filesurface-based agents
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
      <div className="text-surface-500 dark:text-surface-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return <div className="text-surface-500 dark:text-surface-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - matches wireframe */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h1 className="text-lg font-semibold text-surface-900 dark:text-white">
          Agent Workforce
        </h1>
        <button className="text-accent-600 hover:text-accent-500 dark:text-accent-400 dark:hover:text-accent-300 text-sm font-medium">
          Manage Skills
        </button>
      </div>

      {/* Agent Cards Grid - 3 columns on large screens like wireframe */}
      <div className="flex-1 overflow-auto">
        {agents.length === 0 ? (
          <div className="text-center py-12 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800">
            <div className="text-4xl mb-3">🤖</div>
            <div className="text-surface-500 dark:text-surface-400 mb-2">
              No agents found
            </div>
            <div className="text-sm text-surface-400 dark:text-surface-500">
              Add .md files to{" "}
              <code className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded">
                .claude/agents/
              </code>{" "}
              to define agents
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => navigate(`/settings/agents/${agent.id}`)}
                className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-5 cursor-pointer hover:border-accent-500 transition-all relative overflow-hidden group"
              >
                {/* Icon */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-2xl">
                    🤖
                  </div>
                </div>

                {/* Name and Description */}
                <h3 className="font-semibold text-lg text-surface-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4 line-clamp-1">
                  {agent.description || "No description"}
                </p>

                {/* Task Status */}
                <div className="bg-surface-100 dark:bg-surface-700 rounded p-2 text-xs font-mono mb-4 flex justify-between">
                  <span className="text-surface-500 dark:text-surface-400">Task:</span>
                  <span className="text-surface-500 dark:text-surface-400">Idle</span>
                </div>

                {/* Footer */}
                <div className="border-t border-surface-100 dark:border-surface-700 pt-3 flex justify-between items-center">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Standby
                  </span>
                  <span className="text-xs text-surface-400 dark:text-surface-500 hover:text-accent-600 dark:hover:text-accent-400">
                    View Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
