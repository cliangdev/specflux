import type { ReadinessResult } from "../../utils/readiness";

// Terminal icon
function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

// GitHub icon
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// External link icon
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
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
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export type BannerState =
  | "no_session"
  | "session_active"
  | "needs_input"
  | "pr_created";

interface TerminalIntegrationBannerProps {
  // State determines the banner appearance
  state: BannerState;
  // Readiness info for "not ready" messaging
  readiness: ReadinessResult;
  // Whether terminal is showing this task
  isTerminalShowingThisTask: boolean;
  // PR info (when state is 'pr_created')
  prUrl?: string | null;
  prNumber?: number | null;
  // Callbacks
  onOpenInTerminal: () => void;
  onViewTerminal: () => void;
  onOpenPR?: () => void;
}

export default function TerminalIntegrationBanner({
  state,
  readiness,
  isTerminalShowingThisTask,
  prUrl,
  prNumber,
  onOpenInTerminal,
  onViewTerminal,
  onOpenPR,
}: TerminalIntegrationBannerProps) {
  // If terminal is already showing this task, show minimal "open below" state
  if (isTerminalShowingThisTask && state !== "pr_created") {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <TerminalIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium">Terminal is open below</p>
          <p className="text-xs mt-1 text-slate-500">
            Press ⌘T to toggle the terminal panel
          </p>
        </div>
      </div>
    );
  }

  // PR Created state - show prominently
  if (state === "pr_created" && prUrl && prNumber) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <GitHubIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-lg font-medium text-white mb-1">
            Pull Request Created
          </p>
          <p className="text-sm text-slate-400 mb-4">
            PR #{prNumber} is ready for review
          </p>
          <button
            onClick={onOpenPR}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <GitHubIcon className="w-4 h-4" />
            Review on GitHub
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs mt-4 text-slate-500">
            Press ⌘T to view terminal output
          </p>
        </div>
      </div>
    );
  }

  // Agent needs input - warning state with pulsing indicator
  if (state === "needs_input") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center relative">
            <TerminalIcon className="w-8 h-8 text-amber-400" />
            {/* Pulsing indicator */}
            <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 rounded-full animate-pulse" />
          </div>
          <p className="text-lg font-medium text-amber-400 mb-1">
            Agent is waiting for input
          </p>
          <p className="text-sm text-slate-400 mb-4">
            The agent needs your response to continue
          </p>
          <button
            onClick={onViewTerminal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors animate-pulse"
          >
            <TerminalIcon className="w-4 h-4" />
            Go to Terminal
          </button>
        </div>
      </div>
    );
  }

  // Session active - show "View Terminal" option
  if (state === "session_active") {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <TerminalIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-emerald-400 mb-1">
            Terminal session active
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Agent is working on this task
          </p>
          <button
            onClick={onViewTerminal}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            View Terminal
          </button>
          <p className="text-xs mt-3 text-slate-500">
            Or press ⌘T to toggle the terminal panel
          </p>
        </div>
      </div>
    );
  }

  // No session - default state
  return (
    <div className="h-full flex items-center justify-center text-slate-400">
      <div className="text-center">
        <TerminalIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-sm font-medium mb-3">No terminal session</p>
        <button
          onClick={onOpenInTerminal}
          disabled={!readiness.isReady}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            readiness.isReady
              ? "bg-brand-600 hover:bg-brand-700 text-white"
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
          title={
            readiness.isReady
              ? "Start agent in terminal"
              : `Task not ready (${readiness.score}% complete)`
          }
        >
          Open in Terminal
        </button>
        {!readiness.isReady && (
          <p className="text-xs mt-2 text-amber-400">
            Complete Definition of Ready ({readiness.score}%) to enable
          </p>
        )}
        <p className="text-xs mt-3 text-slate-500">
          Or press ⌘T to toggle the terminal panel
        </p>
      </div>
    </div>
  );
}
