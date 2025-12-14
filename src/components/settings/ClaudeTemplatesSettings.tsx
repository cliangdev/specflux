import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { TEMPLATE_REGISTRY, type TemplateDefinition } from "../../templates/registry";
import { getTemplateContent } from "../../templates/templateContent";

type SyncStatus = "synced" | "modified" | "missing";

interface TemplateItem {
  definition: TemplateDefinition;
  status: SyncStatus;
  localContent?: string;
  templateContent: string;
}

// Extract description from frontmatter or first paragraph
function extractDescription(content: string): string {
  // Check for YAML frontmatter
  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      const frontmatter = content.slice(3, endIndex);
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) {
        return descMatch[1].trim();
      }
    }
  }
  // Fall back to first non-header line
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      return trimmed.length > 120 ? trimmed.slice(0, 120) + "..." : trimmed;
    }
  }
  return "";
}

// Get display name for a template
function getDisplayName(template: TemplateDefinition): string {
  switch (template.category) {
    case "command":
      return `/${template.id}`;
    case "skill":
      return template.id.replace("skill-", "");
    case "mcp":
      return "MCP Servers";
    case "config":
      return template.id === "claude-md" ? "CLAUDE.md" : template.id;
    default:
      return template.id;
  }
}

// Get category label
function getCategoryLabel(category: TemplateDefinition["category"]): string {
  switch (category) {
    case "command":
      return "COMMANDS";
    case "skill":
      return "SKILLS";
    case "mcp":
      return "MCP SERVERS";
    case "config":
      return "CONFIG";
  }
}

// Status indicator component
function StatusIndicator({ status }: { status: SyncStatus }) {
  switch (status) {
    case "synced":
      return <span className="text-emerald-500" title="Synced">○</span>;
    case "modified":
      return <span className="text-amber-500" title="Modified">●</span>;
    case "missing":
      return <span className="text-surface-400" title="Missing">◌</span>;
  }
}

export function ClaudeTemplatesSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load templates and check their status
  const loadTemplates = useCallback(async () => {
    if (!currentProject?.localPath) return;

    setLoading(true);
    const items: TemplateItem[] = [];

    for (const def of TEMPLATE_REGISTRY) {
      const templateContent = getTemplateContent(def.sourceFile);
      if (!templateContent) continue;

      try {
        const fullPath = await join(currentProject.localPath, def.destPath);
        const fileExists = await exists(fullPath);

        if (!fileExists) {
          items.push({
            definition: def,
            status: "missing",
            templateContent,
          });
        } else {
          const localContent = await readTextFile(fullPath);
          const status = localContent.trim() === templateContent.trim() ? "synced" : "modified";
          items.push({
            definition: def,
            status,
            localContent,
            templateContent,
          });
        }
      } catch {
        items.push({
          definition: def,
          status: "missing",
          templateContent,
        });
      }
    }

    setTemplates(items);

    // Select first item if none selected
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0].definition.id);
    }

    setLoading(false);
  }, [currentProject, selectedId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Sync a single template
  const syncTemplate = async (templateId: string) => {
    if (!currentProject?.localPath) return;

    const item = templates.find(t => t.definition.id === templateId);
    if (!item) return;

    setSyncing(true);
    try {
      const fullPath = await join(currentProject.localPath, item.definition.destPath);

      // Ensure parent directory exists
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      const parentExists = await exists(parentDir);
      if (!parentExists) {
        await mkdir(parentDir, { recursive: true });
      }

      await writeTextFile(fullPath, item.templateContent);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to sync template:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Sync all templates
  const syncAllTemplates = async () => {
    if (!currentProject?.localPath) return;

    setSyncing(true);
    try {
      for (const item of templates) {
        if (item.status !== "synced") {
          const fullPath = await join(currentProject.localPath, item.definition.destPath);

          // Ensure parent directory exists
          const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
          const parentExists = await exists(parentDir);
          if (!parentExists) {
            await mkdir(parentDir, { recursive: true });
          }

          await writeTextFile(fullPath, item.templateContent);
        }
      }
      await loadTemplates();
    } catch (err) {
      console.error("Failed to sync templates:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, item) => {
    const category = item.definition.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, TemplateItem[]>);

  const selectedTemplate = templates.find(t => t.definition.id === selectedId);
  const unsyncedCount = templates.filter(t => t.status !== "synced").length;

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Claude Code Templates
          </h2>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Commands, skills, and MCP configuration synced from SpecFlux templates
          </p>
        </div>
        <button
          onClick={syncAllTemplates}
          disabled={syncing || unsyncedCount === 0}
          className="btn btn-primary"
        >
          {syncing ? (
            <>
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>Sync All {unsyncedCount > 0 && `(${unsyncedCount})`}</>
          )}
        </button>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden bg-white dark:bg-surface-800 h-[500px]">
        {/* Left Sidebar - Template List */}
        <div className="w-56 border-r border-surface-200 dark:border-surface-700 overflow-y-auto bg-surface-50 dark:bg-surface-900">
          {(["command", "skill", "mcp", "config"] as const).map((category) => {
            const items = groupedTemplates[category] || [];
            if (items.length === 0) return null;

            return (
              <div key={category} className="py-2">
                <div className="px-3 py-1 text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                  {getCategoryLabel(category)} ({items.length})
                </div>
                <div className="mt-1">
                  {items.map((item) => (
                    <button
                      key={item.definition.id}
                      onClick={() => setSelectedId(item.definition.id)}
                      className={`
                        w-full text-left px-3 py-1.5 flex items-center justify-between text-sm
                        ${selectedId === item.definition.id
                          ? "bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300"
                          : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300"
                        }
                      `}
                    >
                      <span className="truncate font-mono text-xs">
                        {getDisplayName(item.definition)}
                      </span>
                      <StatusIndicator status={item.status} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Panel - Detail View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTemplate ? (
            <>
              {/* Detail Header */}
              <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {getDisplayName(selectedTemplate.definition)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-surface-500 dark:text-surface-400">
                      <span className="flex items-center gap-1">
                        <StatusIndicator status={selectedTemplate.status} />
                        {selectedTemplate.status === "synced" && "Synced"}
                        {selectedTemplate.status === "modified" && "Modified"}
                        {selectedTemplate.status === "missing" && "Missing"}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{selectedTemplate.definition.destPath}</span>
                    </div>
                  </div>
                  {selectedTemplate.status !== "synced" && (
                    <button
                      onClick={() => syncTemplate(selectedTemplate.definition.id)}
                      disabled={syncing}
                      className="btn btn-secondary text-sm"
                    >
                      Sync Item
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  {extractDescription(selectedTemplate.templateContent) || selectedTemplate.definition.description}
                </p>
              </div>

              {/* Content Preview */}
              <div className="flex-1 overflow-auto p-4 bg-surface-50 dark:bg-surface-900">
                <pre className="text-xs font-mono text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                  {selectedTemplate.localContent || selectedTemplate.templateContent}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-surface-400 dark:text-surface-500">
              Select a template to view details
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
        <span className="flex items-center gap-1">
          <span className="text-emerald-500">○</span> Synced
        </span>
        <span className="flex items-center gap-1">
          <span className="text-amber-500">●</span> Modified
        </span>
        <span className="flex items-center gap-1">
          <span className="text-surface-400">◌</span> Missing
        </span>
      </div>
    </div>
  );
}
