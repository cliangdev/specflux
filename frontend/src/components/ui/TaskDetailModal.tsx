import { useState, useEffect, useCallback } from "react";
import {
  api,
  type Task,
  type AgentStatus,
  ControlTaskAgentRequestActionEnum,
  AgentStatusStatusEnum,
} from "../../api";
import Terminal from "../Terminal";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-500",
  ready: "bg-blue-500",
  in_progress: "bg-yellow-500",
  pending_review: "bg-purple-500",
  approved: "bg-green-500",
  done: "bg-emerald-600",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "bg-gray-500";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} text-white capitalize`}
    >
      {label}
    </span>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-gray-500",
    running: "bg-green-500",
    paused: "bg-yellow-500",
    stopped: "bg-red-500",
    completed: "bg-emerald-600",
    failed: "bg-red-600",
  };
  const color = colors[status] || "bg-gray-500";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} text-white capitalize`}
    >
      {status === "running" && (
        <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
      )}
      {status}
    </span>
  );
}

export default function TaskDetailModal({
  task,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.tasks.getTaskAgentStatus({ id: task.id });
      setAgentStatus(response.data ?? null);
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchAgentStatus();
  }, [fetchAgentStatus]);

  const handleAgentAction = async (
    action: ControlTaskAgentRequestActionEnum,
  ) => {
    try {
      setActionLoading(true);
      setError(null);
      const response = await api.tasks.controlTaskAgent({
        id: task.id,
        controlTaskAgentRequest: { action },
      });
      setAgentStatus(response.data ?? null);
      onTaskUpdated?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} agent`;
      setError(message);
      console.error(`Failed to ${action} agent:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const isAgentRunning = agentStatus?.status === AgentStatusStatusEnum.Running;
  const isAgentPaused = agentStatus?.status === AgentStatusStatusEnum.Paused;
  const isAgentIdle =
    !agentStatus ||
    agentStatus.status === AgentStatusStatusEnum.Idle ||
    agentStatus.status === AgentStatusStatusEnum.Stopped ||
    agentStatus.status === AgentStatusStatusEnum.Completed ||
    agentStatus.status === AgentStatusStatusEnum.Failed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - wider for split pane */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 border border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">#{task.id}</span>
            <h2 className="text-lg font-semibold text-white">{task.title}</h2>
            <StatusBadge status={task.status} />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
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

        {/* Error banner */}
        {error && (
          <div className="px-6 py-3 bg-red-900/50 border-b border-red-700 text-red-300 text-sm flex-shrink-0">
            {error}
          </div>
        )}

        {/* Content - Split Pane */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Task Details */}
          <div className="w-80 border-r border-gray-700 p-4 overflow-y-auto flex-shrink-0">
            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Description
              </h3>
              <p className="text-sm text-gray-300">
                {task.description || "No description provided"}
              </p>
            </div>

            {/* Agent Status */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Agent Status
              </h3>
              {loading ? (
                <span className="text-gray-500 text-sm">Loading...</span>
              ) : agentStatus ? (
                <div className="space-y-2">
                  <AgentStatusBadge status={agentStatus.status} />
                  {agentStatus.pid && (
                    <p className="text-xs text-gray-500">
                      PID: {agentStatus.pid}
                    </p>
                  )}
                  {agentStatus.startedAt && (
                    <p className="text-xs text-gray-500">
                      Started:{" "}
                      {new Date(agentStatus.startedAt).toLocaleTimeString()}
                    </p>
                  )}
                  {agentStatus.errorMessage && (
                    <p className="text-xs text-red-400">
                      Error: {agentStatus.errorMessage}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">No agent running</span>
              )}
            </div>

            {/* Progress */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Progress
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${task.progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400">
                  {task.progressPercentage}%
                </span>
              </div>
            </div>

            {/* Repository */}
            {task.repoName && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Repository
                </h3>
                <p className="text-sm text-gray-300">{task.repoName}</p>
              </div>
            )}

            {/* Agent Controls */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Agent Controls
              </h3>
              <div className="flex flex-wrap gap-2">
                {isAgentIdle && (
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Start)
                    }
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {actionLoading ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    )}
                    Start
                  </button>
                )}
                {isAgentRunning && (
                  <>
                    <button
                      onClick={() =>
                        handleAgentAction(
                          ControlTaskAgentRequestActionEnum.Pause,
                        )
                      }
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                      </svg>
                      Pause
                    </button>
                    <button
                      onClick={() =>
                        handleAgentAction(
                          ControlTaskAgentRequestActionEnum.Stop,
                        )
                      }
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
                      </svg>
                      Stop
                    </button>
                  </>
                )}
                {isAgentPaused && (
                  <>
                    <button
                      onClick={() =>
                        handleAgentAction(
                          ControlTaskAgentRequestActionEnum.Resume,
                        )
                      }
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Resume
                    </button>
                    <button
                      onClick={() =>
                        handleAgentAction(
                          ControlTaskAgentRequestActionEnum.Stop,
                        )
                      }
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
                      </svg>
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Terminal */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900">
              <span className="text-sm font-medium text-gray-300">
                Agent Terminal
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAgentStatus}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Refresh status"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[400px]">
              <Terminal
                taskId={task.id}
                onStatusChange={(running) => {
                  if (running !== isAgentRunning) {
                    fetchAgentStatus();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
