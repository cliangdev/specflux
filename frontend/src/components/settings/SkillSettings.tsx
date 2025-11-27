import { useState, useEffect } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Skill } from "../../api/generated/models/Skill";

export function SkillSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    deleted: number;
  } | null>(null);

  // Load skills
  useEffect(() => {
    if (currentProject) {
      loadSkills();
    }
  }, [currentProject]);

  const loadSkills = async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.skills.projectsIdSkillsGet({
        id: currentProject.id,
      });

      if (response.success && response.data) {
        setSkills(response.data);
      } else {
        setError("Failed to load skills");
      }
    } catch (err) {
      setError("Failed to load skills");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentProject) return;

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await api.skills.projectsIdSkillsSyncPost({
        id: currentProject.id,
      });

      if (response.success && response.data) {
        setSyncResult(response.data);
        await loadSkills();
      } else {
        setError("Failed to sync skills");
      }
    } catch (err) {
      setError("Failed to sync skills");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (skill: Skill) => {
    setError(null);

    try {
      await api.skills.skillsIdDelete({ id: skill.id });
      await loadSkills();
    } catch (err) {
      setError("Failed to delete skill");
      console.error(err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Skills
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Skills auto-invoke based on file patterns when working in Claude
            Code
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium shadow-sm flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              Syncing...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync from Filesystem
            </>
          )}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-200">
          Sync complete: {syncResult.created} created, {syncResult.updated}{" "}
          updated, {syncResult.deleted} deleted
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Skills are automatically discovered from{" "}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
            .claude/skills/
          </code>{" "}
          directory. Each subdirectory with a{" "}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
            SKILL.md
          </code>{" "}
          file becomes a skill.
        </p>
      </div>

      {/* Skills List */}
      {skills.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No skills found
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Click "Sync from Filesystem" to discover skills in .claude/skills/
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
                  Patterns
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {skills.map((skill) => (
                <tr
                  key={skill.id}
                  className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {skill.name}
                    </div>
                    {skill.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {skill.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {skill.folderPath}
                  </td>
                  <td className="px-4 py-3">
                    {skill.filePatterns && skill.filePatterns.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {skill.filePatterns.slice(0, 3).map((pattern, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded font-mono"
                          >
                            {pattern}
                          </span>
                        ))}
                        {skill.filePatterns.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{skill.filePatterns.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Manual invoke
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(skill)}
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
    </div>
  );
}
