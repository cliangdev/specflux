import { useState, useEffect } from "react";
import { useProject } from "../contexts/ProjectContext";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { FileTree } from "../components/files/FileTree";
import { FilePreview } from "../components/files/FilePreview";

// Local type for file entries (v2 API doesn't have file listing yet)
interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: Date;
}

export default function FilesPage() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dirContents, setDirContents] = useState<Map<string, FileEntry[]>>(
    new Map(),
  );

  useEffect(() => {
    if (currentProject) {
      loadFiles();
    }
  }, [currentProject]);

  const loadFiles = async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const specfluxDir = `${currentProject.localPath}/.specflux`;
      const fileList = await loadDirectory(specfluxDir, "");

      setFiles(fileList);

      // Auto-select first file if available
      const firstFile = fileList.find((item) => item.type === "file");
      if (firstFile?.path) {
        setSelectedPath(firstFile.path);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
      setError(`Failed to load files: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDirectory = async (
    fullPath: string,
    relativePath: string,
  ): Promise<FileEntry[]> => {
    const entries = await readDir(fullPath);
    const fileList: FileEntry[] = [];

    for (const entry of entries) {
      const entryFullPath = `${fullPath}/${entry.name}`;
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name || "";

      const fileStat = await stat(entryFullPath);

      // Handle mtime
      let modifiedAt: Date;
      if (typeof fileStat.mtime === "number") {
        modifiedAt = new Date(fileStat.mtime * 1000);
      } else if (
        fileStat.mtime &&
        typeof fileStat.mtime === "object" &&
        "secs" in fileStat.mtime
      ) {
        const secs = (fileStat.mtime as { secs: number }).secs;
        modifiedAt = new Date(secs * 1000);
      } else {
        modifiedAt = new Date();
      }

      fileList.push({
        name: entry.name || "",
        path: entryRelativePath,
        type: entry.isDirectory ? "directory" : "file",
        size: fileStat.size,
        modifiedAt,
      });
    }

    return fileList;
  };

  const handleDirectoryToggle = async (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);

    if (newExpanded.has(dirPath)) {
      // Collapse
      newExpanded.delete(dirPath);
    } else {
      // Expand - load contents if not already loaded
      newExpanded.add(dirPath);

      if (!dirContents.has(dirPath) && currentProject) {
        try {
          const fullPath = `${currentProject.localPath}/.specflux/${dirPath}`;
          const contents = await loadDirectory(fullPath, dirPath);

          setDirContents((prev) => new Map(prev).set(dirPath, contents));
        } catch (err) {
          console.error(`Failed to load directory ${dirPath}:`, err);
        }
      }
    }

    setExpandedDirs(newExpanded);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">
          No project selected
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
          <button
            onClick={loadFiles}
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="h-14 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Files
        </h1>
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {currentProject.localPath}/.specflux
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree - Left Panel (lighter dark with subtle blue tint) */}
        <div className="w-80 h-full border-r border-gray-200 dark:border-[#2d333b] bg-white dark:bg-[#2d333b] overflow-hidden">
          <FileTree
            files={files}
            selectedPath={selectedPath}
            onFileSelect={setSelectedPath}
            expandedDirs={expandedDirs}
            dirContents={dirContents}
            onDirectoryToggle={handleDirectoryToggle}
          />
        </div>

        {/* File Preview - Right Panel (darker with subtle blue tint) */}
        <div className="flex-1 h-full bg-white dark:bg-[#1c2128] overflow-hidden">
          {selectedPath ? (
            <FilePreview filePath={selectedPath} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a file to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
