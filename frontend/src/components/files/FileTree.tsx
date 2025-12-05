/**
 * File entry in the tree. This type is local since the v2 API
 * doesn't yet have file listing endpoints.
 */
export interface FileEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
}

interface FileTreeProps {
  files: FileEntry[];
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  expandedDirs: Set<string>;
  dirContents: Map<string, FileEntry[]>;
  onDirectoryToggle: (path: string) => void;
}

interface FileTreeItemProps {
  file: FileEntry;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  expandedDirs: Set<string>;
  dirContents: Map<string, FileEntry[]>;
  onDirectoryToggle: (path: string) => void;
}

function FileIcon({ type }: { type: string }) {
  if (type === "directory") {
    return (
      <svg
        className="w-4 h-4 text-blue-500 dark:text-blue-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }

  return (
    <svg
      className="w-4 h-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function Chevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${
        isExpanded ? "rotate-90" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function FileTreeItem({
  file,
  selectedPath,
  onFileSelect,
  expandedDirs,
  dirContents,
  onDirectoryToggle,
}: FileTreeItemProps) {
  const isDirectory = file.type === "directory";
  const isExpanded = file.path ? expandedDirs.has(file.path) : false;
  const isSelected = file.path === selectedPath;

  const handleClick = () => {
    if (isDirectory && file.path) {
      onDirectoryToggle(file.path);
    } else if (file.path) {
      onFileSelect(file.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 ${
          isSelected
            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
            : "text-gray-700 dark:text-gray-300"
        }`}
        onClick={handleClick}
      >
        {isDirectory && <Chevron isExpanded={isExpanded} />}
        <FileIcon type={file.type || "file"} />
        <span className="text-sm flex-1">{file.name}</span>
        {!isDirectory && file.size !== null && file.size !== undefined && (
          <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
        )}
      </div>

      {/* Recursively render children */}
      {isDirectory && isExpanded && dirContents.has(file.path || "") && (
        <div className="ml-4 border-l border-gray-200 dark:border-slate-700 pl-2">
          {dirContents.get(file.path || "")?.map((childFile) => (
            <FileTreeItem
              key={childFile.path}
              file={childFile}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
              expandedDirs={expandedDirs}
              dirContents={dirContents}
              onDirectoryToggle={onDirectoryToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  files,
  selectedPath,
  onFileSelect,
  expandedDirs,
  dirContents,
  onDirectoryToggle,
}: FileTreeProps) {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-0.5">
        {files.map((file) => (
          <FileTreeItem
            key={file.path}
            file={file}
            selectedPath={selectedPath}
            onFileSelect={onFileSelect}
            expandedDirs={expandedDirs}
            dirContents={dirContents}
            onDirectoryToggle={onDirectoryToggle}
          />
        ))}

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No files found
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}
