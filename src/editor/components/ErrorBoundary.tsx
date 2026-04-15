import React from "react";

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: string | null;
  resetKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, error: String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error(`[ToyoSnap ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info);
  }

  reset = () => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="p-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
        >
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Something went wrong in this panel.
          </p>
          {this.state.error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-mono">
              {this.state.error}
            </p>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="mt-3 text-xs underline text-red-700 dark:text-red-300 hover:no-underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            Reload panel
          </button>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
