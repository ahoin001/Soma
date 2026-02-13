import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional fallback UI. If not provided, uses default error UI */
  fallback?: ReactNode;
  /** Called when an error is caught - use for logging to Sentry, etc. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Scope name for logging (e.g., "Nutrition", "Fitness") */
  scope?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

/**
 * Error Boundary with reset capability and logging integration.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary scope="Nutrition" onError={(e) => logToSentry(e)}>
 *   <NutritionPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(
        `[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`,
        error,
        errorInfo.componentStack
      );
    }

    // Call custom error handler (for Sentry, etc.)
    this.props.onError?.(error, errorInfo);

    // Future: Send to error tracking service
    // Example: Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">
              {this.props.scope
                ? `The ${this.props.scope} section encountered an error.`
                : "An unexpected error occurred."}
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="max-w-full overflow-auto rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReset} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Page-level error boundary with full-screen fallback
 */
export class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    if (import.meta.env.DEV) {
      console.error(
        `[PageErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`,
        error,
        errorInfo.componentStack
      );
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the page for a clean slate
    // window.location.reload();
  };

  handleGoHome = () => {
    // Go to auth so recovery is predictable: one place to re-enter the app.
    // /nutrition would redirect to /auth if not signed in, causing erratic PWA behavior.
    window.location.href = "/auth";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {this.props.scope ? `${this.props.scope} Error` : "Page Error"}
            </h2>
            <p className="max-w-md text-muted-foreground">
              We hit a snag loading this page. This has been logged and we&apos;ll look into it.
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="w-full max-w-md text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Technical details
              </summary>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={this.handleGoHome} variant="outline">
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
