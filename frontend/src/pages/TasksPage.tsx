import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts";
import { api } from "../api";
import { v2Api } from "../api/v2/client";
import {
  ListTasksStatusEnum,
  ListTasksSortEnum,
  ListTasksOrderEnum,
} from "../api/generated";
import {
  ListTasksSortEnum as V2SortEnum,
  ListTasksOrderEnum as V2OrderEnum,
  TaskStatus as V2TaskStatus,
} from "../api/v2/generated";
import { TaskCreateModal, Pagination } from "../components/ui";
import {
  type TaskDisplay,
  v1TasksToDisplay,
  v2TasksToDisplay,
} from "../api/adapters/taskAdapter";
import {
  type EpicDisplay,
  v1EpicsToDisplay,
  v2EpicsToDisplay,
} from "../api/adapters/epicAdapter";

const FILTERS_STORAGE_KEY = "specflux-tasks-filters";

interface TasksFilters {
  status: string;
  epicId: string | number | undefined;
  sortField: ListTasksSortEnum;
  sortOrder: ListTasksOrderEnum;
}

function loadFilters(): TasksFilters {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        status: parsed.status ?? "",
        epicId: parsed.epicId ?? undefined,
        sortField: parsed.sortField ?? ListTasksSortEnum.CreatedAt,
        sortOrder: parsed.sortOrder ?? ListTasksOrderEnum.Desc,
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return {
    status: "",
    epicId: undefined,
    sortField: ListTasksSortEnum.CreatedAt,
    sortOrder: ListTasksOrderEnum.Desc,
  };
}

function saveFilters(filters: TasksFilters): void {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "backlog", label: "Backlog" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "done", label: "Done" },
];

// Map v1 status values to v2 TaskStatus enum values
const V1_TO_V2_STATUS_MAP: Record<string, V2TaskStatus> = {
  backlog: V2TaskStatus.Backlog,
  ready: V2TaskStatus.Ready,
  in_progress: V2TaskStatus.InProgress,
  pending_review: V2TaskStatus.InReview,
  approved: V2TaskStatus.Completed, // v2 doesn't have approved, map to completed
  done: V2TaskStatus.Completed,
};

// Status badge configuration matching the mock design
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; classes: string }
> = {
  backlog: {
    label: "Backlog",
    icon: "inbox",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  ready: {
    label: "Ready",
    icon: "circle-dashed",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  in_progress: {
    label: "In Progress",
    icon: "timer",
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800",
  },
  pending_review: {
    label: "Pending Review",
    icon: "eye",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  approved: {
    label: "Approved",
    icon: "check-circle",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  done: {
    label: "Done",
    icon: "check-circle",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

// SVG icons for status badges
const StatusIcons: Record<string, JSX.Element> = {
  inbox: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  "circle-dashed": (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
    </svg>
  ),
  timer: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  eye: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  "check-circle": (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, " "),
    icon: "circle-dashed",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.classes}`}
    >
      {StatusIcons[config.icon]}
      {config.label}
    </span>
  );
}

// Sortable column header component
interface SortableHeaderProps {
  label: string;
  field: ListTasksSortEnum;
  currentSort: ListTasksSortEnum;
  currentOrder: ListTasksOrderEnum;
  onSort: (field: ListTasksSortEnum) => void;
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider cursor-pointer hover:text-system-700 dark:hover:text-system-200 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`ml-1 ${isActive ? "opacity-100" : "opacity-0"}`}>
          {currentOrder === ListTasksOrderEnum.Desc ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </div>
    </th>
  );
}

export default function TasksPage() {
  const { currentProject, usingV2, getProjectRef } = useProject();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial filters from localStorage
  const [initialFilters] = useState(loadFilters);

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);
  const [epicFilter, setEpicFilter] = useState<string | number | undefined>(
    initialFilters.epicId,
  );
  const [epics, setEpics] = useState<EpicDisplay[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<ListTasksSortEnum>(
    initialFilters.sortField,
  );
  const [sortOrder, setSortOrder] = useState<ListTasksOrderEnum>(
    initialFilters.sortOrder,
  );

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters({
      status: statusFilter,
      epicId: epicFilter,
      sortField,
      sortOrder,
    });
  }, [statusFilter, epicFilter, sortField, sortOrder]);

  // Pagination
  const [pagination, setPagination] = useState({
    nextCursor: null as string | null,
    prevCursor: null as string | null,
    hasMore: false,
    total: 0,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch epics for the filter dropdown
  useEffect(() => {
    if (!currentProject) return;

    const fetchEpics = async () => {
      try {
        if (usingV2) {
          const projectRef = getProjectRef();
          if (!projectRef) return;
          console.log("[TasksPage] Fetching epics from v2 API");
          const response = await v2Api.epics.listEpics({ projectRef });
          setEpics(v2EpicsToDisplay(response.data ?? []));
        } else {
          console.log("[TasksPage] Fetching epics from v1 API");
          const response = await api.epics.listEpics({ id: currentProject.id });
          setEpics(v1EpicsToDisplay(response.data ?? []));
        }
      } catch (err) {
        console.error("Failed to fetch epics:", err);
      }
    };

    fetchEpics();
  }, [currentProject, usingV2, getProjectRef]);

  // Validate epicFilter against loaded epics - clear if invalid
  // (handles v1 -> v2 migration where epicId type changes from number to string)
  useEffect(() => {
    if (epics.length > 0 && epicFilter !== undefined) {
      const isValid = epics.some((epic) => epic.id === epicFilter);
      if (!isValid) {
        setEpicFilter(undefined);
      }
    }
  }, [epics, epicFilter]);

  const fetchTasks = useCallback(
    async (cursor?: string, append = false) => {
      if (!currentProject) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        let newTasks: TaskDisplay[];
        let paginationData:
          | {
              nextCursor?: string | null;
              prevCursor?: string | null;
              hasMore?: boolean;
              total?: number;
            }
          | undefined;

        if (usingV2) {
          const projectRef = getProjectRef();
          if (!projectRef) {
            setError("No project selected");
            return;
          }

          // Map v1 sort enum to v2 sort enum
          const v2Sort = sortField as unknown as V2SortEnum;
          const v2Order = sortOrder as unknown as V2OrderEnum;

          // Map status filter to v2 TaskStatus enum using the mapping
          const v2Status = statusFilter
            ? V1_TO_V2_STATUS_MAP[statusFilter]
            : undefined;

          const response = await v2Api.tasks.listTasks({
            projectRef,
            status: v2Status,
            epicRef: epicFilter ? String(epicFilter) : undefined,
            sort: v2Sort,
            order: v2Order,
            cursor,
            limit: 20,
          });

          newTasks = v2TasksToDisplay(response.data ?? []);
          paginationData = response.pagination;
        } else {
          console.log("[TasksPage] Fetching tasks from v1 API");

          const response = await api.tasks.listTasks({
            id: currentProject.id,
            status: (statusFilter || undefined) as
              | ListTasksStatusEnum
              | undefined,
            epicId: typeof epicFilter === "number" ? epicFilter : undefined,
            sort: sortField,
            order: sortOrder,
            cursor,
            limit: 20,
          });

          newTasks = v1TasksToDisplay(response.data ?? []);
          paginationData = response.pagination;
        }

        if (append) {
          setTasks((prev) => [...prev, ...newTasks]);
        } else {
          setTasks(newTasks);
        }

        setPagination({
          nextCursor: paginationData?.nextCursor ?? null,
          prevCursor: paginationData?.prevCursor ?? null,
          hasMore: paginationData?.hasMore ?? false,
          total: paginationData?.total ?? 0,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load tasks";
        setError(message);
        console.error("Failed to fetch tasks:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      currentProject,
      statusFilter,
      epicFilter,
      sortField,
      sortOrder,
      usingV2,
      getProjectRef,
    ],
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSort = (field: ListTasksSortEnum) => {
    if (field === sortField) {
      // Toggle order if same field
      setSortOrder(
        sortOrder === ListTasksOrderEnum.Desc
          ? ListTasksOrderEnum.Asc
          : ListTasksOrderEnum.Desc,
      );
    } else {
      // New field, default to descending
      setSortField(field);
      setSortOrder(ListTasksOrderEnum.Desc);
    }
  };

  const handleLoadMore = () => {
    if (pagination.nextCursor && !loadingMore) {
      fetchTasks(pagination.nextCursor, true);
    }
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          No project selected
        </div>
        <p className="text-system-400 dark:text-system-500 mt-2">
          Select a project from the dropdown above
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-system-900 dark:text-white">
          Tasks
        </h1>
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-[160px]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Epic filter */}
          <select
            value={epicFilter ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setEpicFilter(undefined);
              } else {
                // For v2, epic.id is a string (publicId), for v1 it's a number
                setEpicFilter(usingV2 ? val : Number(val));
              }
            }}
            className="select w-[160px]"
          >
            <option value="">All Epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.title}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={() => fetchTasks()}
            className="btn btn-ghost"
            title="Refresh"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Create button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-8 h-8 text-brand-500"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 text-lg">
            Error loading tasks
          </div>
          <p className="text-system-500 mt-2">{error}</p>
          <button onClick={() => fetchTasks()} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-system-400 dark:text-system-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
            No tasks
          </h3>
          <p className="mt-2 text-system-500">
            {statusFilter || epicFilter
              ? "No tasks match the selected filters."
              : "Get started by creating your first task."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-system-200 dark:divide-system-700">
            <thead className="bg-system-50 dark:bg-system-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider">
                  ID
                </th>
                <SortableHeader
                  label="Title"
                  field={ListTasksSortEnum.Title}
                  currentSort={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Status"
                  field={ListTasksSortEnum.Status}
                  currentSort={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider">
                  Repository
                </th>
                <SortableHeader
                  label="Created"
                  field={ListTasksSortEnum.CreatedAt}
                  currentSort={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-system-200 dark:divide-system-700">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-system-50 dark:hover:bg-system-800/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // For v2, task.id is the publicId (string like "task_xxx")
                    // For v1, task.id is a number
                    // TaskDetailPage will need to handle both
                    navigate(`/tasks/${task.id}`);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-system-500 dark:text-system-400">
                    {task.displayKey}
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <div className="text-sm font-medium text-system-900 dark:text-white truncate">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-sm text-system-500 dark:text-system-400 truncate">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-system-500 dark:text-system-400">
                    {task.repoName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-system-500 dark:text-system-400">
                    {task.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            total={pagination.total}
            hasMore={pagination.hasMore}
            nextCursor={pagination.nextCursor}
            currentCount={tasks.length}
            loading={loadingMore}
            onLoadMore={handleLoadMore}
            itemLabel="tasks"
          />
        </div>
      )}

      {showCreateModal && currentProject && (
        <TaskCreateModal
          projectId={currentProject.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchTasks()}
        />
      )}
    </div>
  );
}
