import { useState } from "react";

// Import prompt templates
import prdPrompt from "../../templates/prompts/prd-context.md?raw";
import epicPrompt from "../../templates/prompts/epic-context.md?raw";
import taskPrompt from "../../templates/prompts/task-context.md?raw";
import projectPrompt from "../../templates/prompts/project-context.md?raw";

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  usedWhen: string;
  content: string;
  variables: string[];
}

const promptTemplates: PromptTemplate[] = [
  {
    id: "prd",
    name: "PRD Context",
    description: "Prompt injected when launching agent from a PRD page",
    usedWhen: "User clicks 'Launch Agent' while viewing a PRD",
    content: prdPrompt,
    variables: ["title", "displayKey", "status", "documentCount"],
  },
  {
    id: "epic",
    name: "Epic Context",
    description: "Prompt injected when launching agent from an Epic page",
    usedWhen: "User clicks 'Launch Agent' while viewing an Epic",
    content: epicPrompt,
    variables: ["title", "displayKey", "status", "taskCount"],
  },
  {
    id: "task",
    name: "Task Context",
    description: "Prompt injected when launching agent from a Task page",
    usedWhen: "User clicks 'Launch Agent' while viewing a Task",
    content: taskPrompt,
    variables: ["title", "displayKey", "status", "priority"],
  },
  {
    id: "project",
    name: "Project Context",
    description: "Default prompt when launching agent from project overview",
    usedWhen: "User clicks 'Launch Agent' from project page without specific context",
    content: projectPrompt,
    variables: ["name", "projectKey"],
  },
];

export function PromptsSettings() {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedPrompt(expandedPrompt === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Agent Prompts
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          These prompts are automatically injected when launching an agent from different contexts.
          The agent receives context-specific instructions to guide the user.
        </p>
      </div>

      {/* Info banner */}
      <div className="p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-accent-800 dark:text-accent-200">
              <strong>How it works:</strong> When you click "Launch Agent" from a PRD, Epic, or Task page,
              SpecFlux injects the corresponding prompt with the current context data.
              The agent then offers relevant actions based on where you launched it.
            </p>
          </div>
        </div>
      </div>

      {/* Prompt Templates List */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden divide-y divide-surface-200 dark:divide-surface-700">
        {promptTemplates.map((template) => (
          <div key={template.id}>
            {/* Header row */}
            <button
              type="button"
              onClick={() => toggleExpand(template.id)}
              className="w-full p-4 flex items-start justify-between text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-surface-900 dark:text-white">
                    {template.name}
                  </span>
                  <span className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 text-xs rounded">
                    {template.id}
                  </span>
                </div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  {template.description}
                </p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                  <strong>Used when:</strong> {template.usedWhen}
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-surface-400 transition-transform ${
                  expandedPrompt === template.id ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Expanded content */}
            {expandedPrompt === template.id && (
              <div className="px-4 pb-4 space-y-3">
                {/* Variables */}
                <div>
                  <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                    Template Variables:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <code
                        key={variable}
                        className="px-2 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs font-mono rounded"
                      >
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Prompt content */}
                <div>
                  <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                    Prompt Template:
                  </p>
                  <pre className="p-3 bg-surface-900 text-surface-100 text-xs font-mono rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {template.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File location info */}
      <div className="text-xs text-surface-400 dark:text-surface-500">
        <p>
          Prompt templates are stored in{" "}
          <code className="text-accent-600 dark:text-accent-400">
            src/templates/prompts/
          </code>
        </p>
      </div>
    </div>
  );
}
