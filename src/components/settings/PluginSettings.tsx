import { useState, useEffect } from "react";
import {
  checkPluginInstalled,
  checkPluginUpdateAvailable,
  updatePlugin,
  PluginStatus,
} from "../../services/pluginManager";

const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

export function PluginSettings() {
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{
    updateAvailable: boolean;
    installedVersion: string | null;
    bundledVersion: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const [pluginStatus, updateStatus] = await Promise.all([
        checkPluginInstalled(),
        checkPluginUpdateAvailable(),
      ]);
      setStatus(pluginStatus);
      setUpdateInfo(updateStatus);
    } catch (error) {
      console.error("Failed to check plugin status:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setMessage(null);
    try {
      const result = await updatePlugin();
      if (result.success) {
        setMessage({
          type: "success",
          text: `Updated to version ${result.newVersion}`,
        });
        await checkStatus();
      } else {
        setMessage({ type: "error", text: result.error || "Update failed" });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Update failed",
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-clear success message
  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          SpecFlux Plugin
        </h2>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Manage the Claude Code plugin that powers /specflux commands
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.installed ? (
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
            ) : (
              <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <div className="font-medium text-surface-900 dark:text-surface-100">
                {status?.installed ? "Plugin Installed" : "Plugin Not Installed"}
              </div>
              {status?.version && (
                <div className="text-sm text-surface-600 dark:text-surface-400">
                  Version {status.version}
                </div>
              )}
              {updateInfo?.bundledVersion && (
                <div className="text-sm text-surface-500 dark:text-surface-500">
                  Latest: {updateInfo.bundledVersion}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${checking ? "animate-spin" : ""}`}
            />
            Check
          </button>
        </div>

        {/* Update Available Banner */}
        {updateInfo?.updateAvailable && (
          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Update Available
                </div>
                <div className="text-sm text-surface-600 dark:text-surface-400">
                  {updateInfo.installedVersion} → {updateInfo.bundledVersion}
                </div>
              </div>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Now"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info Section */}
      <div className="text-sm text-surface-600 dark:text-surface-400 space-y-2">
        <p>
          The SpecFlux plugin adds planning and implementation commands to
          Claude Code:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <code className="bg-surface-100 dark:bg-surface-700 px-1 rounded">
              /specflux:planning
            </code>{" "}
            - Create PRDs, epics, and tasks
          </li>
          <li>
            <code className="bg-surface-100 dark:bg-surface-700 px-1 rounded">
              /specflux:implement
            </code>{" "}
            - Implement tasks with test-first workflow
          </li>
        </ul>
      </div>
    </div>
  );
}
