import { useState, useEffect } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Project } from "../../api/generated/models/Project";

type WorkflowTemplate = "startup-fast" | "design-first" | "full-lifecycle";

const workflowTemplates: {
  id: WorkflowTemplate;
  label: string;
  description: string;
}[] = [
  {
    id: "startup-fast",
    label: "Startup Fast",
    description:
      "Minimal process. Phases: Planning → Implementation. Auto-approvals enabled for speed.",
  },
  {
    id: "design-first",
    label: "Design First",
    description:
      "Design upfront. Phases: Discovery → Design → Planning → Implementation. Design before planning.",
  },
  {
    id: "full-lifecycle",
    label: "Full Lifecycle",
    description:
      "Enterprise workflow. Phases: Discovery → Planning → Design → Architecture → Implementation → Testing → Documentation.",
  },
];

export function WorkflowSettings() {
  const { currentProject, refreshProjects } = useProject();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate>("startup-fast");
  const [initialTemplate, setInitialTemplate] =
    useState<WorkflowTemplate>("startup-fast");

  // Load project config
  useEffect(() => {
    if (currentProject) {
      setLoading(true);
      api.projects
        .getProject({ ref: currentProject.id })
        .then((project: Project) => {
          // Note: workflowTemplate is not yet in the Project type
          // This will be added when the backend endpoint is updated
          const template = "startup-fast" as WorkflowTemplate;
          setSelectedTemplate(template);
          setInitialTemplate(template);
        })
        .catch((err) => {
          setError("Failed to load workflow settings");
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Update this when workflowTemplate is added to UpdateProjectRequest
      await api.projects.updateProject({
        ref: currentProject.id,
        updateProjectRequest: {
          name: currentProject.name,
          // workflowTemplate: selectedTemplate, // Will be added in backend
        },
      });

      setSuccess(true);
      setInitialTemplate(selectedTemplate);
      await refreshProjects();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save workflow settings");
      console.error(err);
    } finally {
      setSaving(false);
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

  const hasChanges = selectedTemplate !== initialTemplate;

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          How Workflow Templates Work
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p>
            Workflow templates control which phases are available and approval
            requirements:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Phases:</strong> Determines which work types are enabled
              (Discovery, Design, Planning, etc.)
            </li>
            <li>
              <strong>Approvals:</strong> Startup Fast auto-approves tasks;
              others require manual review
            </li>
            <li>
              <strong>Board columns:</strong> All templates use the same status
              columns (Backlog → Ready → In Progress → Pending Review → Approved
              → Done)
            </li>
          </ul>
        </div>
      </div>

      {/* Workflow Template */}
      <div>
        <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">
          Workflow Template
        </h2>

        <div className="space-y-3">
          {workflowTemplates.map((template) => (
            <label
              key={template.id}
              className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
            >
              <input
                type="radio"
                name="workflow"
                value={template.id}
                checked={selectedTemplate === template.id}
                onChange={(e) =>
                  setSelectedTemplate(e.target.value as WorkflowTemplate)
                }
                className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {template.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {template.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Warning about workflow switching */}
      {hasChanges && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">
                Switching workflows may affect existing tasks
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Startup Fast has 5 columns (no Approved phase)</li>
                <li>Design First/Full Lifecycle have 6 columns (+Approved)</li>
                <li>Tasks in removed columns will move to the nearest phase</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-200">
          Workflow template updated successfully
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={() => {
            setSelectedTemplate(initialTemplate);
            setError(null);
            setSuccess(false);
          }}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
