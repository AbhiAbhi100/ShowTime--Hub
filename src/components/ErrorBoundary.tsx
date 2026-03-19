import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-destructive/50 rounded-lg p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="bg-muted p-4 rounded text-xs font-mono mb-6 overflow-auto max-h-48 text-left">
              {this.state.error?.toString()}
              {this.state.error?.stack && (
                <div className="mt-2 text-muted-foreground opacity-70">
                   {this.state.error.stack}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => window.location.reload()} className="w-full">
                Refresh Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }} 
                className="w-full"
              >
                Clear Cache & Restart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
