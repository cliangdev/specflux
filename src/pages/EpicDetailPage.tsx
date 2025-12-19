import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  api,
  getApiErrorMessage,
  type Epic,
  type Task,
  type AcceptanceCriteria as AcceptanceCriterion,
  EpicStatus,
} from "../api";
import { useProject } from "../contexts";
import { ProgressBar, TaskCreateModal } from "../components/ui";
import { DetailPageHeader } from "../components/ui/DetailPageHeader";
import { AIActionButton } from "../components/ui/AIActionButton";
import { AcceptanceCriteriaList } from "../components/ui/AcceptanceCriteriaList";
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import PrdSelector from "../components/epics/PrdSelector";
import ReleaseSelector from "../components/epics/ReleaseSelector";
import { usePageContext } from "../hooks/usePageContext";
import { useTerminal } from "../contexts/TerminalContext";
import { generateEpicPrompt } from "../services/promptGenerator";

// Extended type to support v2 fields
type EpicWithV2Fields = Omit<Epic, "dependsOn" | "taskStats" | "status"> & {
  v2Id?: string;
  displayKey?: string;
  status: string;
  taskStats?: {
    total?: number;
    done?: number;
    inProgress?: number;
    backlog?: number;
  };
  progressPercentage?: number;
  phase?: number;
  dependsOn?: (number | string)[];
  createdById?: string;
  prdFilePath?: string;
  epicFilePath?: string;
  prdId?: string;
};

// Task status badge configuration
const TASK_STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  BACKLOG: {
    label: "Backlog",
    classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  READY: {
    label: "Ready",
    classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    classes: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
  },
  IN_REVIEW: {
    label: "In Review",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  BLOCKED: {
    label: "Blocked",
    classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  COMPLETED: {
    label: "Completed",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Cancelled",
    classes: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

// Epic status options for DetailPageHeader
const EPIC_STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

export default function EpicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, getProjectRef } = useProject();
  const { openTerminalForContext, getExistingSession, switchToSession, activeSession, isRunning } = useTerminal();

  const [epic, setEpic] = useState<EpicWithV2Fields | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [allEpics, setAllEpics] = useState<EpicWithV2Fields[]>([]);
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline description editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  // Set page context for terminal
  usePageContext(
    epic
      ? { type: "epic-detail", id: epic.v2Id || epic.id, title: epic.displayKey || epic.title }
      : null
  );

  const fetchEpicData = useCallback(async () => {
    if (!id) return;
    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch epic
      const epicResponse = await api.epics.getEpic({ projectRef, epicRef: id });
      const v2Epic = epicResponse;
      const statusMap: Record<string, "planning" | "active" | "completed"> = {
        PLANNING: "planning",
        IN_PROGRESS: "active",
        COMPLETED: "completed",
      };

      const epicData: EpicWithV2Fields = {
        id: v2Epic.id,
        v2Id: v2Epic.id,
        displayKey: v2Epic.displayKey,
        projectId: v2Epic.projectId,
        title: v2Epic.title,
        description: v2Epic.description,
        status: statusMap[v2Epic.status] || "planning",
        targetDate: v2Epic.targetDate,
        createdById: v2Epic.createdById,
        createdAt: new Date(v2Epic.createdAt),
        updatedAt: new Date(v2Epic.updatedAt),
        releaseId: v2Epic.releaseId,
        prdId: v2Epic.prdId,
        prdFilePath: v2Epic.prdFilePath,
        epicFilePath: v2Epic.epicFilePath,
        dependsOn: v2Epic.dependsOn ?? [],
        taskStats: v2Epic.taskStats ?? { total: 0, done: 0, inProgress: 0, backlog: 0 },
        progressPercentage: v2Epic.progressPercentage ?? 0,
        phase: v2Epic.phase ?? 1,
      };
      setEpic(epicData);

      // Fetch tasks
      try {
        const tasksResponse = await api.epics.listEpicTasks({ projectRef, epicRef: id, limit: 100 });
        const v2Tasks = tasksResponse.data ?? [];
        const convertedTasks = v2Tasks.map((t) => ({
          id: 0,
          v2Id: t.id,
          displayKey: t.displayKey,
          projectId: 0,
          epicId: null,
          epicDisplayKey: t.epicDisplayKey ?? null,
          title: t.title,
          description: t.description ?? null,
          status: t.status,
          priority: t.priority,
          requiresApproval: t.requiresApproval,
          estimatedDuration: t.estimatedDuration ?? null,
          actualDuration: t.actualDuration ?? null,
          githubPrUrl: t.githubPrUrl ?? null,
          createdByUserId: 0,
          assignedToUserId: null,
          progressPercentage: 0,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        })) as unknown as Task[];
        setTasks(convertedTasks);
      } catch (err) {
        console.error("Failed to fetch epic tasks:", err);
        setTasks([]);
      }

      // Fetch all epics for dependencies
      const allEpicsResponse = await api.epics.listEpics({ projectRef });
      const v2Epics = allEpicsResponse.data ?? [];
      const convertedEpics: EpicWithV2Fields[] = v2Epics.map((e) => ({
        id: e.id,
        v2Id: e.id,
        displayKey: e.displayKey,
        projectId: e.projectId,
        title: e.title,
        description: e.description,
        status: e.status,
        targetDate: e.targetDate,
        createdById: e.createdById,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        releaseId: e.releaseId,
        phase: e.phase,
      }));
      setAllEpics(convertedEpics);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load epic";
      setError(message);
      console.error("Failed to fetch epic:", err);
    } finally {
      setLoading(false);
    }
  }, [id, getProjectRef]);

  const fetchCriteria = useCallback(async () => {
    if (!id) return;
    try {
      setCriteriaLoading(true);
      const projectRef = getProjectRef();
      if (!projectRef) {
        setCriteria([]);
        setCriteriaLoading(false);
        return;
      }
      const response = await api.epics.listEpicAcceptanceCriteria({ projectRef, epicRef: id });
      const v2Criteria = response.data ?? [];
      const convertedCriteria: AcceptanceCriterion[] = v2Criteria.map((c) => ({
        id: c.id,
        criteria: c.criteria,
        isMet: c.isMet,
        orderIndex: c.orderIndex,
        createdAt: new Date(c.createdAt),
      })) as unknown as AcceptanceCriterion[];
      setCriteria(convertedCriteria);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
    } finally {
      setCriteriaLoading(false);
    }
  }, [id, getProjectRef]);

  useEffect(() => {
    fetchEpicData();
    fetchCriteria();
  }, [fetchEpicData, fetchCriteria]);

  const getEpicRef = (e: EpicWithV2Fields): string | number => e.v2Id || e.id;

  const phase = useMemo(() => epic?.phase ?? 1, [epic]);

  // Dependencies
  const dependencyEpics = useMemo(() => {
    if (!epic?.dependsOn || epic.dependsOn.length === 0) return [];
    const depsSet = new Set(epic.dependsOn);
    return allEpics.filter((e) => e.v2Id && depsSet.has(e.v2Id));
  }, [epic, allEpics]);

  // Map status to v2 enum
  const mapStatusToV2 = (status: string): EpicStatus => {
    switch (status) {
      case "PLANNING": return EpicStatus.Planning;
      case "IN_PROGRESS": return EpicStatus.InProgress;
      case "COMPLETED": return EpicStatus.Completed;
      default: return EpicStatus.Planning;
    }
  };

  // Handlers
  const handleStatusChange = async (newStatus: string) => {
    if (!epic) return;
    try {
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: { status: mapStatusToV2(newStatus) },
      });
      fetchEpicData();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!epic) return;
    try {
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: { title: newTitle },
      });
      fetchEpicData();
    } catch (err) {
      console.error("Failed to update title:", err);
      setError(err instanceof Error ? err.message : "Failed to update title");
    }
  };

  const handleReleaseChange = async (releaseId: string | null) => {
    if (!epic) return;
    const projectRef = getProjectRef();
    if (!projectRef || !epic.v2Id) return;

    // Optimistically update local state
    const previousReleaseId = epic.releaseId;
    setEpic({ ...epic, releaseId: releaseId ?? undefined });

    try {
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: { releaseRef: releaseId === null ? "" : releaseId },
      });
    } catch (err) {
      // Revert on error
      setEpic({ ...epic, releaseId: previousReleaseId });
      console.error("Failed to update release:", err);
      setError(err instanceof Error ? err.message : "Failed to update release");
    }
  };

  const handlePrdChange = async (prdId: string | null) => {
    if (!epic) return;
    const projectRef = getProjectRef();
    if (!projectRef || !epic.v2Id) return;

    // Optimistically update local state
    const previousPrdId = epic.prdId;
    setEpic({ ...epic, prdId: prdId ?? undefined });

    try {
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: { prdRef: prdId === null ? "" : prdId },
      });
    } catch (err) {
      // Revert on error
      setEpic({ ...epic, prdId: previousPrdId });
      console.error("Failed to update PRD:", err);
      setError(err instanceof Error ? err.message : "Failed to update PRD");
    }
  };

  const handleDescriptionSave = async () => {
    if (!epic) return;
    const trimmed = editDescription.trim();
    const oldDescription = epic.description ?? "";

    // Always exit editing mode
    setEditingDescription(false);

    if (trimmed !== oldDescription) {
      // Optimistically update local state
      setEpic({ ...epic, description: trimmed || undefined });

      try {
        const projectRef = getProjectRef();
        if (!projectRef || !epic.v2Id) return;
        await api.epics.updateEpic({
          projectRef,
          epicRef: epic.v2Id,
          updateEpicRequest: { description: trimmed || "" },
        });
      } catch (err) {
        // Revert on error
        setEpic({ ...epic, description: oldDescription || undefined });
        console.error("Failed to update description:", err);
        setError(err instanceof Error ? err.message : "Failed to update description");
      }
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditDescription(epic?.description ?? "");
      setEditingDescription(false);
    }
    // Ctrl/Cmd + Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleDescriptionSave();
    }
  };

  const handleDelete = async () => {
    if (!epic) return;
    try {
      setDeleting(true);
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.deleteEpic({ projectRef, epicRef: epic.v2Id });
      navigate("/epics");
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to delete epic");
      setError(message);
      console.error("Failed to delete epic:", err);
      setDeleting(false);
    }
  };

  const handleStartWork = () => {
    if (epic) {
      const initialPrompt = generateEpicPrompt({
        title: epic.title,
        displayKey: epic.displayKey || epic.v2Id || epic.id,
        status: epic.status,
        taskCount: epic.taskStats?.total ?? 0,
      });
      const context = {
        type: "epic" as const,
        id: epic.v2Id || epic.id,
        title: epic.title,
        displayKey: epic.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: "claude",
        initialPrompt,
      };
      const existing = getExistingSession(context);
      if (existing) {
        switchToSession(existing.id);
      } else {
        openTerminalForContext(context);
      }
    }
  };

  const handleContinueWork = () => {
    if (epic) {
      const context = {
        type: "epic" as const,
        id: epic.v2Id || epic.id,
        title: epic.title,
        displayKey: epic.displayKey,
      };
      const existing = getExistingSession(context);
      if (existing) {
        switchToSession(existing.id);
      }
    }
  };

  const hasExistingSession = epic
    ? !!getExistingSession({
        type: "epic" as const,
        id: epic.v2Id || epic.id,
        title: epic.title,
      })
    : false;

  const isTerminalShowingThisEpic = activeSession?.contextId === (epic?.v2Id || epic?.id);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin w-8 h-8 text-accent-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 text-lg">Error loading epic</div>
        <p className="text-surface-500 mt-2">{error}</p>
        <button onClick={fetchEpicData} className="mt-4 btn btn-primary">Try Again</button>
      </div>
    );
  }

  // Not found state
  if (!epic) {
    return (
      <div className="text-center py-12">
        <div className="text-surface-500 dark:text-surface-400 text-lg">Epic not found</div>
        <Link to="/epics" className="mt-4 btn btn-primary inline-block">Back</Link>
      </div>
    );
  }

  const taskStats = epic.taskStats || { total: 0, done: 0, inProgress: 0 };
  const totalTasks = taskStats.total ?? 0;
  const doneTasks = taskStats.done ?? 0;
  const progressPercent = epic.progressPercentage ?? (totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);
  const remaining = (taskStats.total ?? 0) - (taskStats.done ?? 0) - (taskStats.inProgress ?? 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <DetailPageHeader
        backTo="/epics"
        entityKey={epic.displayKey}
        title={epic.title}
        status={epic.status.toUpperCase()}
        statusOptions={EPIC_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        onTitleChange={handleTitleChange}
        selectors={
          <>
            <PrdSelector
              projectRef={getProjectRef() ?? undefined}
              selectedPrdId={epic.prdId}
              onChange={handlePrdChange}
            />
            <ReleaseSelector
              projectRef={getProjectRef() ?? undefined}
              selectedReleaseId={epic.releaseId}
              onChange={handleReleaseChange}
            />
          </>
        }
        badges={[{ label: "Phase", value: `P${phase}` }]}
        createdAt={epic.createdAt}
        updatedAt={epic.updatedAt}
        primaryAction={
          <AIActionButton
            entityType="epic"
            entityId={epic.v2Id || epic.id}
            entityTitle={epic.title}
            hasExistingSession={hasExistingSession}
            isTerminalActive={isTerminalShowingThisEpic && isRunning}
            onStartWork={handleStartWork}
            onContinueWork={hasExistingSession ? handleContinueWork : undefined}
          />
        }
        actions={[
          {
            label: deleting ? "Deleting..." : "Delete Epic",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            onClick: handleDelete,
            variant: "danger" as const,
          },
        ]}
        isLoading={loading}
      />

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Summary, Acceptance Criteria, Tasks */}
        <div className="w-80 flex-shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto scrollbar-hidden">
          {/* Summary Section */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">
              Summary
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Progress</div>
                <ProgressBar percent={progressPercent} size="sm" showLabel />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-lg font-semibold text-surface-900 dark:text-white">{taskStats.done ?? 0}</div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">Done</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-accent-600 dark:text-accent-400">{taskStats.inProgress ?? 0}</div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">In Progress</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-surface-600 dark:text-surface-300">{remaining}</div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">Remaining</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-surface-900 dark:text-white">{taskStats.total ?? 0}</div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Acceptance Criteria Section */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2.5 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Acceptance Criteria
                </h3>
              </div>
              {/* Content */}
              <div className="p-3">
                {criteriaLoading ? (
                  <div className="text-sm text-surface-400 dark:text-surface-500">Loading...</div>
                ) : (
                  <AcceptanceCriteriaList
                    entityType="epic"
                    projectRef={getProjectRef() ?? ""}
                    entityRef={epic.v2Id || String(epic.id)}
                    criteria={criteria}
                    onUpdate={fetchCriteria}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="p-4">
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Tasks ({tasks.length})
                </h3>
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
                >
                  + Add
                </button>
              </div>

              {/* Content */}
              {tasks.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    No tasks yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-surface-200 dark:divide-surface-700">
                  {tasks.map((task) => {
                    const taskStatusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.BACKLOG;
                    const taskWithV2 = task as Task & { v2Id?: string; publicId?: string; displayKey?: string };
                    const taskRef = taskWithV2.v2Id || taskWithV2.publicId || task.id;
                    const displayId = taskWithV2.displayKey || taskWithV2.v2Id || taskWithV2.publicId || `#${task.id}`;
                    return (
                      <Link
                        key={taskRef}
                        to={`/tasks/${taskRef}`}
                        className="block px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="text-xs font-mono text-surface-400 dark:text-surface-500 flex-shrink-0">
                            {displayId}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${taskStatusConfig.classes}`}>
                            {taskStatusConfig.label}
                          </span>
                        </div>
                        <div className="text-sm text-surface-700 dark:text-surface-300 truncate mt-1">
                          {task.title}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
              Description
            </h2>
            {editingDescription ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescriptionSave}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
                >
                  Save
                </button>
                <span className="text-surface-300 dark:text-surface-600">|</span>
                <button
                  onClick={() => {
                    setEditDescription(epic.description ?? "");
                    setEditingDescription(false);
                  }}
                  className="text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditDescription(epic.description ?? "");
                  setEditingDescription(true);
                }}
                className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
              >
                Edit
              </button>
            )}
          </div>
          {/* Content */}
          <div className={`flex-1 px-8 pb-8 ${editingDescription ? 'overflow-hidden' : 'overflow-auto'}`}>
            {editingDescription ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                placeholder="Enter description (supports Markdown)..."
                className="w-full h-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                autoFocus
              />
            ) : epic.description ? (
              <MarkdownRenderer source={epic.description} />
            ) : (
              <p className="text-surface-400 dark:text-surface-500 italic">
                No description yet. Click Edit to add one.
              </p>
            )}
          </div>
        </div>

        {/* Right Sidebar - Dependencies */}
        <div className="w-64 flex-shrink-0 border-l border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto scrollbar-hidden">
          {/* Dependencies Section */}
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">
              Dependencies
            </h2>
            {dependencyEpics.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                No dependencies (Phase 1)
              </p>
            ) : (
              <div className="space-y-2">
                {dependencyEpics.map((depEpic) => {
                  const depRef = getEpicRef(depEpic);
                  const displayId = depEpic.displayKey || depEpic.v2Id || `#${depEpic.id}`;
                  return (
                    <Link
                      key={depRef}
                      to={`/epics/${depRef}`}
                      className="block px-2 py-1.5 rounded text-sm bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    >
                      <span className="text-xs text-surface-500 dark:text-surface-400 mr-2">{displayId}</span>
                      <span className="text-surface-700 dark:text-surface-300">{depEpic.title}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && epic && (
        <TaskCreateModal
          projectId={epic.projectId}
          defaultEpicId={epic.id}
          onClose={() => setShowCreateTaskModal(false)}
          onCreated={fetchEpicData}
        />
      )}
    </div>
  );
}
