import { useState, useEffect } from "react";
import {
  parseGitHubUrl,
  validateGitUrl,
  getClonePath,
  cloneRepository,
  cancelClone,
  getDefaultBranch,
  buildGitHubSshUrl,
  addRemote,
  type CloneProgress,
} from "../../services/git";

type CloneState = "input" | "cloning" | "success" | "error";

interface CloneRepositoryModalProps {
  localPath: string;
  onClose: () => void;
  onCloned: (repoName: string, repoPath: string) => void;
}

export function CloneRepositoryModal({
  localPath,
  onClose,
  onCloned,
}: CloneRepositoryModalProps) {
  const [gitUrl, setGitUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [clonePath, setClonePath] = useState("");
  const [repoName, setRepoName] = useState("");
  const [originalOwner, setOriginalOwner] = useState("");
  const [state, setState] = useState<CloneState>("input");
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState("main");

  // Fork workflow & SSH alias
  const [githubUsername, setGithubUsername] = useState("");
  const [sshAlias, setSshAlias] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [upstreamUrl, setUpstreamUrl] = useState("");

  useEffect(() => {
    const parsed = parseGitHubUrl(gitUrl);
    if (parsed) {
      setRepoName(parsed.repo);
      setOriginalOwner(parsed.owner);
      setClonePath(getClonePath(localPath, parsed.repo));
      setUrlError(null);

      const username = githubUsername.trim();
      const alias = sshAlias.trim() || (parsed.isSshAlias ? parsed.sshAliasHost : undefined);

      if (username) {
        setOriginUrl(buildGitHubSshUrl(username, parsed.repo, alias));
        setUpstreamUrl(buildGitHubSshUrl(parsed.owner, parsed.repo, parsed.isSshAlias ? parsed.sshAliasHost : undefined));
      } else {
        if (parsed.isSshAlias && !sshAlias.trim()) {
          setOriginUrl(parsed.fullUrl);
        } else {
          setOriginUrl(buildGitHubSshUrl(parsed.owner, parsed.repo, alias));
        }
        setUpstreamUrl("");
      }
    } else if (gitUrl.trim()) {
      setRepoName("");
      setOriginalOwner("");
      setClonePath("");
      setOriginUrl("");
      setUpstreamUrl("");
      const validation = validateGitUrl(gitUrl);
      setUrlError(validation.error || null);
    } else {
      setRepoName("");
      setOriginalOwner("");
      setClonePath("");
      setOriginUrl("");
      setUpstreamUrl("");
      setUrlError(null);
    }
  }, [gitUrl, githubUsername, sshAlias, localPath]);

  const handleClone = async () => {
    const validation = validateGitUrl(gitUrl);
    if (!validation.valid) {
      setUrlError(validation.error || "Invalid URL");
      return;
    }

    setState("cloning");
    setProgress(null);
    setError(null);

    const result = await cloneRepository(originUrl, clonePath, (p) => {
      setProgress(p);
    });

    if (result.success) {
      if (upstreamUrl) {
        const remoteResult = await addRemote(clonePath, "upstream", upstreamUrl);
        if (!remoteResult.success) {
          console.warn("Failed to add upstream remote:", remoteResult.error);
        }
      }

      const branch = await getDefaultBranch(clonePath);
      setDefaultBranch(branch);
      setState("success");
    } else {
      setError(result.error || "Clone failed");
      setState("error");
    }
  };

  const handleCancel = async () => {
    if (state === "cloning") {
      await cancelClone();
    }
    onClose();
  };

  const handleDone = () => {
    onCloned(repoName, clonePath);
    onClose();
  };

  const handleCloneAnother = () => {
    setGitUrl("");
    setClonePath("");
    setRepoName("");
    setOriginalOwner("");
    setGithubUsername("");
    setSshAlias("");
    setOriginUrl("");
    setUpstreamUrl("");
    setState("input");
    setProgress(null);
    setError(null);
  };

  const handleRetry = () => {
    setState("input");
    setError(null);
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    if (progress.phase === "done") return 100;
    if (progress.percent !== undefined) return progress.percent;
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {state === "success"
              ? "Repository Cloned!"
              : state === "cloning"
                ? "Cloning Repository..."
                : state === "error"
                  ? "Clone Failed"
                  : "Clone from GitHub"}
          </h3>
          {state !== "cloning" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4">
          {state === "input" && (
            <div className="space-y-4">
              {/* GitHub URL Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Repository URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-sm focus:ring-1 outline-none bg-white dark:bg-slate-900 ${
                    urlError
                      ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500"
                  }`}
                  placeholder="https://github.com/owner/repo-name"
                  autoFocus
                />
                {urlError ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {urlError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The repository you want to work with (can be yours or a teammate's)
                  </p>
                )}
              </div>

              {/* GitHub Username (for fork workflow) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Your GitHub Username{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (optional, for fork workflow)
                  </span>
                </label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-1 outline-none bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-brand-500"
                  placeholder="your-github-username"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {githubUsername.trim()
                    ? `Will clone your fork and add ${originalOwner || "original"} as upstream`
                    : "Leave empty to clone directly from the URL above"}
                </p>
              </div>

              {/* SSH Host Alias (for multi-account users) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  SSH Host Alias{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (optional, for multi-account)
                  </span>
                </label>
                <input
                  type="text"
                  value={sshAlias}
                  onChange={(e) => setSshAlias(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-1 outline-none bg-white dark:bg-slate-900 focus:border-brand-500 focus:ring-brand-500"
                  placeholder="github.com-work"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {sshAlias.trim()
                    ? `Will use ${sshAlias}:owner/repo.git format`
                    : "Leave empty for default git@github.com format"}
                </p>
              </div>

              {/* Remote URLs Preview */}
              {originUrl && (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">origin:</span>
                    <span className="text-gray-700 dark:text-gray-300 font-mono break-all">
                      {originUrl}
                    </span>
                  </div>
                  {upstreamUrl && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">upstream:</span>
                      <span className="text-gray-700 dark:text-gray-300 font-mono break-all">
                        {upstreamUrl}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Clone Path (Read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Clone to
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm text-gray-600 dark:text-gray-300 font-mono min-h-[38px] overflow-x-auto whitespace-nowrap">
                  {clonePath || (
                    <span className="text-gray-400 dark:text-gray-500 font-sans">
                      Enter a GitHub URL above
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {state === "cloning" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <svg
                  className="animate-spin w-5 h-5 text-brand-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Cloning {repoName} from GitHub...
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${getProgressPercent()}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {progress?.message || "Starting clone..."}
                </div>
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-base font-medium">
                  Successfully cloned {repoName}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                {/* Location */}
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                  <div className="text-sm text-gray-900 dark:text-white font-mono overflow-x-auto whitespace-nowrap">
                    {clonePath}
                  </div>
                </div>

                {/* Branch */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Branch</span>
                  <span className="text-sm text-gray-900 dark:text-white">{defaultBranch}</span>
                </div>

                {/* Remotes info */}
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Remotes</div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">origin</span>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-mono overflow-x-auto whitespace-nowrap mt-0.5">
                        {originUrl}
                      </div>
                    </div>
                    {upstreamUrl && (
                      <div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">upstream</span>
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-mono overflow-x-auto whitespace-nowrap mt-0.5">
                          {upstreamUrl}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
                <svg
                  className="w-6 h-6 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="text-base font-medium block">
                    Failed to clone repository
                  </span>
                  <span className="text-sm mt-1 block">{error}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
          {state === "input" && (
            <>
              <button
                onClick={onClose}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={!gitUrl.trim() || !!urlError}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Clone Repository
              </button>
            </>
          )}

          {state === "cloning" && (
            <button
              onClick={handleCancel}
              className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          )}

          {state === "success" && (
            <>
              <button
                onClick={handleCloneAnother}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Clone Another
              </button>
              <button
                onClick={handleDone}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Done
              </button>
            </>
          )}

          {state === "error" && (
            <>
              <button
                onClick={onClose}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
