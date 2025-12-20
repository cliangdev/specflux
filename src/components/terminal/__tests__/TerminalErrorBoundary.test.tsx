import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalErrorBoundary } from "../TerminalErrorBoundary";

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div data-testid="child-content">Child content</div>;
}

describe("TerminalErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error for expected errors
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error occurs", () => {
    render(
      <TerminalErrorBoundary sessionId="test-session">
        <div data-testid="child">Test content</div>
      </TerminalErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    render(
      <TerminalErrorBoundary sessionId="test-session">
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    );

    expect(screen.getByText("Terminal Crashed")).toBeInTheDocument();
    expect(screen.getByText("Restart Terminal")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("calls onReset when restart button is clicked", () => {
    const onReset = vi.fn();

    render(
      <TerminalErrorBoundary sessionId="test-session" onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    );

    fireEvent.click(screen.getByText("Restart Terminal"));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("clears error state when restart button is clicked", () => {
    // Use a key to force remount after reset
    let key = 1;
    const { rerender } = render(
      <TerminalErrorBoundary key={key} sessionId="test-session">
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText("Terminal Crashed")).toBeInTheDocument();

    // Click restart - this clears the internal error state
    fireEvent.click(screen.getByText("Restart Terminal"));

    // The error boundary clears its state, but React still has the same
    // child that would throw. In real usage, the parent would force a
    // remount by changing the key or re-creating the PTY session.
    // Here we simulate that by changing the key and providing a non-throwing child.
    key = 2;
    rerender(
      <TerminalErrorBoundary key={key} sessionId="test-session">
        <ThrowError shouldThrow={false} />
      </TerminalErrorBoundary>
    );

    // Should now show child content
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.queryByText("Terminal Crashed")).not.toBeInTheDocument();
  });

  it("logs error details to console", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <TerminalErrorBoundary sessionId="test-session">
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    );

    // React logs errors, and our componentDidCatch also logs
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Find our specific log call
    const ourLogCall = consoleErrorSpy.mock.calls.find(
      call => call[0] === "[TerminalErrorBoundary] Terminal crashed:"
    );
    expect(ourLogCall).toBeDefined();
  });
});
