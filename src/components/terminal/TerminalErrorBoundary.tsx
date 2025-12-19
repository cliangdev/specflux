import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  sessionId: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch terminal crashes without unmounting the entire panel.
 * Provides a graceful recovery UI instead of crashing the whole app.
 */
export class TerminalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[TerminalErrorBoundary] Terminal crashed:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-surface-900 text-surface-300 p-4">
          <svg
            className="w-12 h-12 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">
            Terminal Crashed
          </h3>
          <p className="text-sm text-surface-400 mb-4 text-center max-w-md">
            The terminal encountered an error and needs to be restarted.
            {this.state.error && (
              <span className="block mt-1 text-xs text-surface-500 font-mono">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors"
          >
            Restart Terminal
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
