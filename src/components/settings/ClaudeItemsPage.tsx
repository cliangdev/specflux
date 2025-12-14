import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { TEMPLATE_REGISTRY, type TemplateDefinition } from "../../templates/registry";
import { getTemplateContent } from "../../templates/templateContent";
import MarkdownRenderer from "../ui/MarkdownRenderer";

type SyncStatus = "synced" | "modified" | "missing";

interface TemplateItem {
  definition: TemplateDefinition;
  status: SyncStatus;
  localContent?: string;
  templateContent: string;
}

interface ClaudeItemsPageProps {
  category: "command" | "skill" | "mcp";
}

// Get display name for a template
function getDisplayName(template: TemplateDefinition): string {
  switch (template.category) {
    case "command":
      return `/${template.id}`;
    case "skill":
      return template.id.replace("skill-", "");
    case "mcp":
      return ".mcp.json";
    default:
      return template.id;
  }
}

// Get category title
function getCategoryTitle(category: TemplateDefinition["category"]): string {
  switch (category) {
    case "command":
      return "Commands";
    case "skill":
      return "Skills";
    case "mcp":
      return "MCP Servers";
    default:
      return "Items";
  }
}

// Get category description
function getCategoryDescription(category: TemplateDefinition["category"]): string {
  switch (category) {
    case "command":
      return "Slash commands available in Claude Code for this project.";
    case "skill":
      return "Skill files that provide domain-specific knowledge to Claude Code.";
    case "mcp":
      return "Model Context Protocol server configuration.";
    default:
      return "";
  }
}

// Status badge component
function StatusBadge({ status }: { status: SyncStatus }) {
  switch (status) {
    case "synced":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Synced
        </span>
      );
    case "modified":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Modified
        </span>
      );
    case "missing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Missing
        </span>
      );
  }
}

export function ClaudeItemsPage({ category }: ClaudeItemsPageProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load templates and check their status
  const loadTemplates = useCallback(async () => {
    if (!currentProject?.localPath) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const items: TemplateItem[] = [];

    const categoryTemplates = TEMPLATE_REGISTRY.filter(t => t.category === category);

    for (const def of categoryTemplates) {
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
    setLoading(false);
  }, [currentProject, category]);

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

  // Sync all templates in this category
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const unsyncedCount = templates.filter(t => t.status !== "synced").length;

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-surface-500 dark:text-surface-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            {getCategoryTitle(category)}
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {getCategoryDescription(category)}
          </p>
        </div>
        {templates.length > 0 && (
          <button
            onClick={syncAllTemplates}
            disabled={syncing || unsyncedCount === 0}
            className="btn btn-secondary text-sm"
          >
            {syncing ? "Syncing..." : `Sync All${unsyncedCount > 0 ? ` (${unsyncedCount})` : ""}`}
          </button>
        )}
      </div>

      {/* Template Cards */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-surface-500 dark:text-surface-400">
          No {getCategoryTitle(category).toLowerCase()} available
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((item) => {
            const isExpanded = expandedId === item.definition.id;

            return (
              <div
                key={item.definition.id}
                className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden bg-white dark:bg-surface-800"
              >
                {/* Card Header - Clickable */}
                <button
                  onClick={() => toggleExpand(item.definition.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                >
                  {/* Expand/Collapse Icon */}
                  <svg
                    className={`w-4 h-4 text-surface-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Name */}
                  <span className="font-mono text-sm font-medium text-surface-900 dark:text-white">
                    {getDisplayName(item.definition)}
                  </span>

                  {/* Description */}
                  <span className="text-sm text-surface-500 dark:text-surface-400 truncate flex-1">
                    {item.definition.description}
                  </span>

                  {/* Status Badge */}
                  <StatusBadge status={item.status} />

                  {/* Sync Button (only if not synced) */}
                  {item.status !== "synced" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        syncTemplate(item.definition.id);
                      }}
                      disabled={syncing}
                      className="btn btn-primary text-xs py-1 px-2"
                    >
                      Sync
                    </button>
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-surface-200 dark:border-surface-700">
                    {/* File Path */}
                    <div className="px-4 py-2 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
                      <span className="text-xs font-mono text-surface-500 dark:text-surface-400">
                        {item.definition.destPath}
                      </span>
                    </div>

                    {/* Content Preview */}
                    <div className="p-4 max-h-96 overflow-auto">
                      {item.definition.destPath.endsWith(".json") ? (
                        <pre className="text-sm font-mono text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                          {item.localContent || item.templateContent}
                        </pre>
                      ) : (
                        <MarkdownRenderer
                          source={item.localContent || item.templateContent}
                          className="prose prose-sm dark:prose-invert max-w-none"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
