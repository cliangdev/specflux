import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  api,
  type Epic,
  type UpdateEpicRequest,
  type Release,
} from "../../api";
import { calculatePhase } from "../../utils/phaseCalculation";

interface EpicEditModalProps {
  epic: Epic;
  projectId: string;
  allEpics: Epic[]; // All epics in the same release for dependency selection
  onClose: () => void;
  onUpdated: () => void;
}

export default function EpicEditModal({
  epic,
  projectId,
  allEpics,
  onClose,
  onUpdated,
}: EpicEditModalProps) {
  const [title, setTitle] = useState(epic.title);
  const [description, setDescription] = useState(epic.description ?? "");
  const [prdFilePath, setPrdFilePath] = useState(epic.prdFilePath ?? "");
  const [status, setStatus] = useState(epic.status);
  const [releaseId, setReleaseId] = useState<string | null>(
    epic.releaseId ?? null,
  );
  const [dependsOn, setDependsOn] = useState<string[]>(epic.dependsOn ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);

  // Fetch releases for the project
  useEffect(() => {
    api.releases
      .listReleases({ projectRef: projectId })
      .then((response) => {
        setReleases(response.data ?? []);
      })
      .catch((err) => {
        console.error("Failed to fetch releases:", err);
      });
  }, [projectId]);

  // Available epics for dependency selection (exclude current epic)
  const availableEpics = useMemo(() => {
    return allEpics.filter((e) => e.id !== epic.id);
  }, [allEpics, epic.id]);

  // Calculate the phase preview based on current dependency selection
  const phasePreview = useMemo(() => {
    if (dependsOn.length === 0) return 1;

    // Build a map for phase calculation
    const epicsMap = new Map<string, { dependsOn: string[] }>();
    for (const e of allEpics) {
      if (e.id === epic.id) {
        // Use the currently selected dependencies for this epic
        epicsMap.set(e.id, { dependsOn });
      } else {
        epicsMap.set(e.id, { dependsOn: e.dependsOn ?? [] });
      }
    }

    return calculatePhase(epic.id, epicsMap);
  }, [dependsOn, allEpics, epic.id]);

  // Detect circular dependencies
  const circularError = useMemo(() => {
    if (dependsOn.length === 0) return null;

    // Check if any selected dependency depends on this epic (directly or transitively)
    const visited = new Set<string>();
    const stack = [...dependsOn];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (currentId === epic.id) {
        return "Circular dependency detected! This epic cannot depend on an epic that already depends on it.";
      }
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentEpic = allEpics.find((e) => e.id === currentId);
      if (currentEpic?.dependsOn) {
        stack.push(...currentEpic.dependsOn);
      }
    }

    return null;
  }, [dependsOn, allEpics, epic.id]);

  const handleDependencyToggle = (epicId: string) => {
    setDependsOn((prev) =>
      prev.includes(epicId)
        ? prev.filter((id) => id !== epicId)
        : [...prev, epicId],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (circularError) {
      setError(circularError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: UpdateEpicRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        prdFilePath: prdFilePath.trim() || undefined,
        status: status as UpdateEpicRequest["status"],
        releaseRef: releaseId || undefined,
      };

      await api.epics.updateEpic({
        projectRef: projectId,
        epicRef: epic.id,
        updateEpicRequest: request,
      });

      onUpdated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update epic";
      setError(message);
      console.error("Failed to update epic:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Edit Epic
          </h2>
          <button
            onClick={onClose}
            className="text-system-400 hover:text-system-600 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter epic title"
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="input resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Epic["status"])}
                className="select w-full"
              >
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="release"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Release
              </label>
              <select
                id="release"
                value={releaseId ?? ""}
                onChange={(e) => setReleaseId(e.target.value || null)}
                className="select w-full"
              >
                <option value="">No Release (Unscheduled)</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                Assign to a release to show this epic in the Roadmap
              </p>
            </div>

            <div>
              <label
                htmlFor="prdFilePath"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                PRD File Path
              </label>
              <input
                id="prdFilePath"
                type="text"
                value={prdFilePath}
                onChange={(e) => setPrdFilePath(e.target.value)}
                placeholder="e.g., prds/feature-name.md"
                className="input"
              />
            </div>

            {/* Dependencies Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-system-700 dark:text-system-300">
                  Depends On
                </label>
                {dependsOn.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                    Phase {phasePreview}
                  </span>
                )}
              </div>

              {circularError && (
                <div className="mb-2 p-2 bg-semantic-warning/10 border border-semantic-warning/30 rounded text-semantic-warning text-xs">
                  {circularError}
                </div>
              )}

              {availableEpics.length === 0 ? (
                <p className="text-sm text-system-500 dark:text-system-400 italic">
                  No other epics available for dependencies
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-system-200 dark:border-system-700 rounded-lg p-2">
                  {availableEpics.map((e) => {
                    const isSelected = dependsOn.includes(e.id);
                    const epicPhase = e.phase ?? 1;
                    return (
                      <label
                        key={e.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800"
                            : "hover:bg-system-50 dark:hover:bg-system-700/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleDependencyToggle(e.id)}
                          className="rounded border-system-300 dark:border-system-600 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-system-500 dark:text-system-400">
                              #{e.id}
                            </span>
                            <span className="text-sm text-system-900 dark:text-white truncate">
                              {e.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-system-100 dark:bg-system-700 text-system-600 dark:text-system-400">
                          P{epicPhase}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                Select epics that must be completed before this one can start.
                {dependsOn.length === 0
                  ? " No dependencies = Phase 1"
                  : ` This will be Phase ${phasePreview}`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-system-600 dark:text-system-300 hover:text-system-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !!circularError}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
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
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
