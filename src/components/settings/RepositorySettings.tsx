import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Repository } from "../../api/generated/models/Repository";
import { useProjectHealth } from "../../hooks/useProjectHealth";
import { CloneRepositoryModal } from "./CloneRepositoryModal";
import { CreateRepositoryModal } from "./CreateRepositoryModal";
import { addToGitignore } from "../../services/git";

interface RepositoryFormData {
  name: string;
  path: string;
  gitUrl: string;
  defaultAgent: string;
}

type ModalMode = "edit" | null;
type AddMode = "create" | "clone" | null;

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
  };

  const handleSave = async () => {
    if (!currentProject?.id || !editingRepo) return;

    setSaving(true);
    setError(null);

    try {
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
    } catch (err) {
      setError("Failed to update repository");
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

  // Handle cloned or created repository
  const handleRepositoryAdded = async (repoName: string, repoPath: string) => {
    if (!currentProject?.id || !currentProject.localPath) return;

    try {
      // Add to gitignore
      await addToGitignore(currentProject.localPath, repoName);

      // Register the repository in the backend
      await api.repositories.createRepository({
        projectRef: currentProject.id,
        createRepositoryRequest: {
          name: repoName,
          path: repoPath,
        },
      });

      await loadRepositories();
    } catch (err) {
      setError("Failed to register repository");
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
            onClick={() => setAddMode("create")}
            disabled={!canClone}
            title={
              !canClone
                ? "Complete project setup first (set local path and install git)"
                : "Create a new empty repository"
            }
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create New
          </button>
          <button
            onClick={() => setAddMode("clone")}
            disabled={!canClone}
            title={
              !canClone
                ? "Complete project setup first (set local path and install git)"
                : "Clone a repository from GitHub"
            }
            className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
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
                      className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 text-sm font-medium"
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

      {/* Edit Modal */}
      {modalMode === "edit" && editingRepo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Repository
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Local Path
                  <span className="text-xs text-gray-400 ml-2">
                    (cannot be changed)
                  </span>
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {formData.path}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Repository Name
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-gray-400 min-h-[38px] flex items-center font-mono">
                  {formData.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Git URL
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-gray-400 min-h-[38px] flex items-center break-all font-mono">
                  {formData.gitUrl || (
                    <span className="text-gray-400 dark:text-gray-500 font-sans">
                      Not configured
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
                disabled={saving || !formData.name || !formData.path}
                className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
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
          onCloned={handleRepositoryAdded}
        />
      )}

      {/* Create Repository Modal */}
      {addMode === "create" && currentProject?.localPath && (
        <CreateRepositoryModal
          localPath={currentProject.localPath}
          onClose={() => setAddMode(null)}
          onCreated={handleRepositoryAdded}
        />
      )}
    </div>
  );
}
