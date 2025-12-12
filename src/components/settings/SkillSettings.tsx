import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { extractDescription } from "./AgentSettings";

// Local skill type for filesurface-based skills
export interface LocalSkill {
  id: string;
  name: string;
  description?: string;
  folderPath: string;
}

export function SkillSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<LocalSkill[]>([]);

  // Load skills from filesystem (.claude/skills/*/SKILL.md)
  const loadSkills = useCallback(async () => {
    if (!currentProject?.localPath) return;

    setLoading(true);

    try {
      const skillsDir = `${currentProject.localPath}/.claude/skills`;
      const entries = await readDir(skillsDir);
      const loadedSkills: LocalSkill[] = [];

      for (const entry of entries) {
        if (entry.isDirectory && entry.name) {
          try {
            const skillPath = `${skillsDir}/${entry.name}/SKILL.md`;
            const content = await readTextFile(skillPath);
            loadedSkills.push({
              id: entry.name,
              name: entry.name,
              description: extractDescription(content),
              folderPath: `.claude/skills/${entry.name}`,
            });
          } catch {
            // No SKILL.md in this directory, skip
          }
        }
      }

      setSkills(loadedSkills);
    } catch {
      // Directory doesn't exist - show empty state
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
