import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Repository } from "../../api/generated/models/Repository";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectHealth } from "../../hooks/useProjectHealth";
import { CloneRepositoryModal } from "./CloneRepositoryModal";

interface RepositoryFormData {
  name: string;
  path: string;
  gitUrl: string;
  defaultAgent: string;
}

interface ValidationState {
  isGitRepo: boolean;
  message?: string;
}

type ModalMode = "add" | "edit" | null;
type AddMode = "browse" | "clone" | null;

export function RepositorySettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: "",
    path: "",
    gitUrl: "",
    defaultAgent: "",
  });
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    isGitRepo: true,
  });

  // Project health check - only need status for clone button
  const { status: healthStatus } = useProjectHealth(currentProject);

  const canClone = healthStatus !== "error" && currentProject?.localPath;

  const loadRepositories = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.repositories.listRepositories({
        projectRef: currentProject.id,
      });

      setRepositories(response.data ?? []);
    } catch (err) {
      setError("Failed to load repositories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    if (currentProject) {
      loadRepositories();
    }
  }, [currentProject, loadRepositories]);

  const handleAddClick = () => {
    setFormData({
      name: "",
      path: "",
      gitUrl: "",
      defaultAgent: "",
    });
    setEditingRepo(null);
    setModalMode("add");
  };

  const handleEditClick = (repo: Repository) => {
    setFormData({
      name: repo.name,
      path: repo.path,
      gitUrl: repo.gitUrl || "",
      defaultAgent: "",
    });
    setEditingRepo(repo);
    setModalMode("edit");
  };

  const handleModalClose = () => {
    setModalMode(null);
    setEditingRepo(null);
    setFormData({
      name: "",
      path: "",
      gitUrl: "",
      defaultAgent: "",
    });
    setValidation({
      isGitRepo: true,
    });
  };

  const handleSave = async () => {
    if (!currentProject?.id) return;

    setSaving(true);
    setError(null);

    try {
      if (modalMode === "add") {
        await api.repositories.createRepository({
          projectRef: currentProject.id,
          createRepositoryRequest: {
            name: formData.name,
            path: formData.path,
            gitUrl: formData.gitUrl || undefined,
          },
        });

        await loadRepositories();
        handleModalClose();
      } else if (modalMode === "edit" && editingRepo) {
        await api.repositories.updateRepository({
          projectRef: currentProject.id,
          repoRef: editingRepo.id,
          updateRepositoryRequest: {
            name: formData.name,
            gitUrl: formData.gitUrl || undefined,
          },
        });

        await loadRepositories();
        handleModalClose();
      }
    } catch (err) {
      setError(
        modalMode === "add"
          ? "Failed to add repository"
          : "Failed to update repository",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (repo: Repository) => {
    setDeletingRepo(repo);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRepo || !currentProject?.id) return;

    setError(null);

    try {
      await api.repositories.deleteRepository({
        projectRef: currentProject.id,
        repoRef: deletingRepo.id,
      });
      await loadRepositories();
      setDeletingRepo(null);
    } catch (err) {
      setError("Failed to remove repository");
      console.error(err);
      setDeletingRepo(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingRepo(null);
  };

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Repository Directory",
      });

      if (selected && typeof selected === "string") {

        // Extract directory name as default repo name
        const pathParts = selected.split("/");
        const dirName = pathParts[pathParts.length - 1] || "";

        setFormData({
          ...formData,
          path: selected,
          name: dirName,
          gitUrl: "",
        });

        // Assume it's a valid git repo for now
        // TODO: Add validation when backend API supports it
        setValidation({
          isGitRepo: true,
        });
      }
    } catch (err) {
      console.error("Failed to open directory picker:", err);
      setError("Failed to open directory picker: " + String(err));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
            Ready
          </span>
        );
      case "syncing":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            Syncing
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
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

  // Handle cloned repository
  const handleCloned = async (repoName: string, repoPath: string) => {
    if (!currentProject?.id) return;

    try {
      // Register the cloned repository in the backend
      await api.repositories.createRepository({
        projectRef: currentProject.id,
        createRepositoryRequest: {
          name: repoName,
          path: repoPath,
        },
      });

      await loadRepositories();
    } catch (err) {
      setError("Failed to register cloned repository");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Code Repositories
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddClick}
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            Browse Local
          </button>
          <button
            onClick={() => setAddMode("clone")}
            disabled={!canClone}
            title={
              !canClone
                ? "Complete project setup first (set local path and install git)"
                : "Clone a repository from GitHub"
            }
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
          >
            Clone from GitHub
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Repository List */}
      {repositories.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No repositories yet
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Add a repository to get started
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Path
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {repositories.map((repo) => (
                <tr
                  key={repo.id}
                  className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                    {repo.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {repo.path}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(repo.status)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEditClick(repo)}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(repo)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Add Repository" : "Edit Repository"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Local Path
                  {modalMode === "edit" && (
                    <span className="text-xs text-gray-400 ml-2">
                      (cannot be changed)
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) =>
                      setFormData({ ...formData, path: e.target.value })
                    }
                    disabled={modalMode === "edit"}
                    className={`flex-1 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none ${
                      modalMode === "edit"
                        ? "bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900"
                    }`}
                    placeholder="/Users/you/code/my-backend"
                  />
                  {modalMode === "add" && (
                    <button
                      type="button"
                      onClick={handleBrowse}
                      className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
                    >
                      Browse
                    </button>
                  )}
                </div>
              </div>

              {/* Validation Warning */}
              {!validation.isGitRepo && validation.message && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
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
                  <span>{validation.message}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Repository Name
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-gray-400 min-h-[38px] flex items-center font-mono">
                  {formData.name || (
                    <span className="text-gray-400 dark:text-gray-500 font-sans">
                      Select a directory to auto-detect
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Git URL
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-gray-400 min-h-[38px] flex items-center break-all font-mono">
                  {formData.gitUrl || (
                    <span className="text-gray-400 dark:text-gray-500 font-sans">
                      Not configured (GitHub integration coming soon)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={handleModalClose}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  !formData.name ||
                  !formData.path ||
                  !validation.isGitRepo
                }
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                {saving
                  ? "Saving..."
                  : modalMode === "add"
                    ? "Add Repository"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRepo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Remove Repository
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to remove{" "}
                <span className="font-semibold">"{deletingRepo.name}"</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This will not delete the repository files.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Remove Repository
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Repository Modal */}
      {addMode === "clone" && currentProject?.localPath && (
        <CloneRepositoryModal
          localPath={currentProject.localPath}
          onClose={() => setAddMode(null)}
          onCloned={handleCloned}
        />
      )}
    </div>
  );
}
