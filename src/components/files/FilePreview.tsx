import { useState, useEffect, useCallback } from "react";
import MarkdownRenderer from "../ui/MarkdownRenderer";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useProject } from "../../contexts/ProjectContext";

interface FilePreviewProps {
  filePath: string;
}

export function FilePreview({ filePath }: FilePreviewProps) {
  const { currentProject } = useProject();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFileContent = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const fullPath = `${currentProject.localPath}/.specflux/${filePath}`;
      const fileContent = await readTextFile(fullPath);
      setContent(fileContent);
    } catch (err) {
      setError("Failed to load file content");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, filePath]);

  useEffect(() => {
    loadFileContent();
  }, [loadFileContent]);

  const isMarkdown = filePath.endsWith(".md");

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
          <button
            onClick={loadFileContent}
            className="text-sm text-accent-600 dark:text-accent-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#1c2128]">
      {/* File Path Header */}
      <div className="h-12 border-b border-gray-200 dark:border-[#30363d] flex items-center px-6 shrink-0 bg-gray-50 dark:bg-[#2d333b]">
        <h2 className="text-sm font-medium text-gray-900 dark:text-[#adbac7] truncate">
          {filePath}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isMarkdown ? (
          <div className="p-8">
            <MarkdownRenderer source={content} />
          </div>
        ) : (
          <pre className="p-8 text-sm font-mono text-gray-800 dark:text-[#adbac7] whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
