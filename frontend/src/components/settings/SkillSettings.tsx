import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import type { Skill } from "../../api/generated/models/Skill";

export function SkillSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto-sync and load skills on mount
  const syncAndLoadSkills = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      // First sync from filesystem
      await api.skills.projectsIdSkillsSyncPost({
        id: currentProject.id,
      });

      // Then load skills
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
  }, [currentProject]);

  useEffect(() => {
    syncAndLoadSkills();
  }, [syncAndLoadSkills]);

  const handleDelete = async (skill: Skill) => {
    setError(null);

    try {
      await api.skills.skillsIdDelete({ id: skill.id });
      await syncAndLoadSkills();
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
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Skills
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Skills auto-invoke based on file patterns when working in Claude Code
        </p>
      </div>

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

      {/* Skills Cards */}
      {skills.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            No skills found
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Add skill subdirectories with SKILL.md files to .claude/skills/
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                {/* Emoji */}
                <div className="text-3xl">📚</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {skill.name}
                  </h3>
                  {skill.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-2">
                    {skill.folderPath}
                  </div>
                  {skill.filePatterns && skill.filePatterns.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skill.filePatterns.slice(0, 3).map((pattern, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded font-mono"
                        >
                          {pattern}
                        </span>
                      ))}
                      {skill.filePatterns.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{skill.filePatterns.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(skill)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Delete"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
