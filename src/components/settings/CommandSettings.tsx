import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

interface LocalCommand {
  id: string;
  name: string;
  description: string;
  filePath: string;
  content: string;
  fileSize: number;
}

// Extract first line of content as description
function extractDescription(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      // Truncate to reasonable length
      return trimmed.length > 100 ? trimmed.slice(0, 100) + "..." : trimmed;
    }
  }
  return "";
}

export function CommandSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [commands, setCommands] = useState<LocalCommand[]>([]);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);

  // Load commands from filesystem (.claude/commands/*.md)
  const loadCommands = useCallback(async () => {
    if (!currentProject?.localPath) return;

    setLoading(true);

    try {
      const commandsDir = `${currentProject.localPath}/.claude/commands`;
      const entries = await readDir(commandsDir);
      const loadedCommands: LocalCommand[] = [];

      for (const entry of entries) {
        if (entry.name?.endsWith(".md")) {
          try {
            const fullPath = `${commandsDir}/${entry.name}`;
            const content = await readTextFile(fullPath);
            const name = entry.name.replace(".md", "");
            loadedCommands.push({
              id: name,
              name: `/${name}`,
              description: extractDescription(content),
              filePath: `.claude/commands/${entry.name}`,
              content,
              fileSize: new Blob([content]).size,
            });
          } catch (err) {
            console.warn(`Failed to read command file ${entry.name}:`, err);
          }
        }
      }

      // Sort alphabetically
      loadedCommands.sort((a, b) => a.name.localeCompare(b.name));
      setCommands(loadedCommands);

      // Expand first command by default
      if (loadedCommands.length > 0 && !expandedCommand) {
        setExpandedCommand(loadedCommands[0].id);
      }
    } catch {
      // Directory doesn't exist - show empty state
      setCommands([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject, expandedCommand]);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  const toggleExpand = (commandId: string) => {
    setExpandedCommand(expandedCommand === commandId ? null : commandId);
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (!currentProject) {
    return (
      <div className="text-surface-500 dark:text-surface-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin w-6 h-6 text-accent-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Commands
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Slash commands from <code className="text-xs bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">.claude/commands/</code>
        </p>
      </div>

      {/* Commands List */}
      {commands.length === 0 ? (
        <div className="text-center py-12 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800">
          <svg
            className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            No commands found
          </p>
          <p className="text-surface-400 dark:text-surface-500 text-xs mt-1">
            Add .md files to .claude/commands/ to create slash commands
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commands.map((command) => {
            const isExpanded = expandedCommand === command.id;

            return (
              <div
                key={command.id}
                className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden bg-white dark:bg-surface-800"
              >
                {/* Command Header */}
                <button
                  onClick={() => toggleExpand(command.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⌘</span>
                    <div className="text-left">
                      <div className="font-mono text-sm font-medium text-surface-900 dark:text-white">
                        {command.name}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                        {command.filePath} · {formatFileSize(command.fileSize)}
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-surface-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-surface-200 dark:border-surface-700">
                    {/* Content Preview */}
                    <div className="p-4 bg-surface-50 dark:bg-surface-900">
                      <pre className="text-xs font-mono text-surface-700 dark:text-surface-300 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                        {command.content}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-2">
                      <button
                        onClick={() => copyToClipboard(command.content)}
                        className="btn btn-ghost text-xs"
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
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-surface-400 dark:text-surface-500 border-t border-surface-200 dark:border-surface-700 pt-4">
        <p>
          Slash commands let you create custom prompts for Claude Code. Each .md file
          in <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">.claude/commands/</code> becomes
          a command you can invoke with <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">/commandname</code>.
        </p>
      </div>
    </div>
  );
}
