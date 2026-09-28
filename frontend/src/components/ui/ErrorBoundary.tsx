"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import {
  generateCorrelationId,
  resolveCorrelationId,
} from "@/lib/correlationId";
import { reportBoundaryError } from "@/lib/errorReporter";
import { ErrorBoundaryFallbackPage } from "./ErrorBoundaryFallbackPage";

// ─── Public API ────────────────────────────────────────────────────────────

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom fallback UI. Receives error details so callers can render
   * context-specific messages.
   */
  fallback?: ReactNode | ((props: FallbackRenderProps) => ReactNode);
  /**
   * Called after the error is captured. Receives the Error and React
   * ErrorInfo (component stack). Useful for route-level side effects.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when the user triggers a reset (retry). */
  onReset?: () => void;
  /**
   * Label shown in the "back" action button.
   * @default "Back to dashboard"
   */
  backLabel?: string;
  /**
   * href for the "back" action button.
   * @default "/dashboard"
   */
  backHref?: string;
}

export interface FallbackRenderProps {
  error: Error;
  correlationId: string;
  reset: () => void;
}

// ─── State ─────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  correlationId: string;
}

// ─── Error Boundary Class ───────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, correlationId: "" };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      // Correlation ID generated at capture time
      correlationId: generateCorrelationId(),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const correlationId = resolveCorrelationId(error, this.state.correlationId);

    // Update state with resolved (possibly backend-origin) ID
    if (correlationId !== this.state.correlationId) {
      this.setState({ correlationId });
    }

    reportBoundaryError({
      error,
      componentStack: errorInfo.componentStack,
      correlationId,
      route:
        typeof window !== "undefined" ? window.location.pathname : "unknown",
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReset(): void {
    this.setState({ hasError: false, error: null, correlationId: "" });
    this.props.onReset?.();
  }

  override render(): ReactNode {
    const { hasError, error, correlationId } = this.state;
    const {
      children,
      fallback,
      backLabel = "Back to dashboard",
      backHref = "/dashboard",
    } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // Custom fallback: render-prop form
    if (typeof fallback === "function") {
      return fallback({
        error,
        correlationId,
        reset: this.handleReset,
      });
    }

    // Custom fallback: static ReactNode
    if (fallback !== undefined) {
      return fallback;
    }

    // Default branded fallback — the shared full-page error UI, so the class
    // boundary and the route-level error.tsx pages stay identical.
    return (
      <ErrorBoundaryFallbackPage
        correlationId={correlationId}
        onRetry={this.handleReset}
        errorMessage={
          process.env.NODE_ENV !== "production" && error.message
            ? error.message
            : "An unexpected error occurred. Your funds are safe — this page could not be loaded."
        }
        backLabel={backLabel}
        backHref={backHref}
        minHeightClass="min-h-[40vh]"
      />
    );
  }
}
