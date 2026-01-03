import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncStatusBadge } from "../SyncStatusBadge";

describe("SyncStatusBadge", () => {
  describe("rendering", () => {
    it("renders synced status with green color", () => {
      const { container } = render(<SyncStatusBadge status="synced" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-emerald-100");
      expect(badge).toHaveClass("text-emerald-700");
    });

    it("renders pending_push status with amber color", () => {
      const { container } = render(<SyncStatusBadge status="pending_push" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-amber-100");
      expect(badge).toHaveClass("text-amber-700");
    });

    it("renders pending_pull status with accent color", () => {
      const { container } = render(<SyncStatusBadge status="pending_pull" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-accent-100");
      expect(badge).toHaveClass("text-accent-700");
    });

    it("renders conflict status with red color", () => {
      const { container } = render(<SyncStatusBadge status="conflict" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-red-100");
      expect(badge).toHaveClass("text-red-700");
    });

    it("renders offline status with gray color", () => {
      const { container } = render(<SyncStatusBadge status="offline" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-surface-100");
      expect(badge).toHaveClass("text-surface-600");
    });

    it("renders local_only status with gray color", () => {
      const { container } = render(<SyncStatusBadge status="local_only" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-surface-100");
      expect(badge).toHaveClass("text-surface-600");
    });
  });

  describe("icons", () => {
    it("shows check circle icon for synced status", () => {
      const { container } = render(<SyncStatusBadge status="synced" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("shows pulsing indicator for pending_push status", () => {
      const { container } = render(<SyncStatusBadge status="pending_push" />);
      const pulsingDot = container.querySelector(".animate-ping");
      expect(pulsingDot).toBeInTheDocument();
    });

    it("shows pulsing indicator for pending_pull status", () => {
      const { container } = render(<SyncStatusBadge status="pending_pull" />);
      const pulsingDot = container.querySelector(".animate-ping");
      expect(pulsingDot).toBeInTheDocument();
    });
  });

  describe("showLabel prop", () => {
    it("does not show label by default", () => {
      render(<SyncStatusBadge status="synced" />);
      expect(screen.queryByText("Synced")).not.toBeInTheDocument();
    });

    it("shows label when showLabel is true", () => {
      render(<SyncStatusBadge status="synced" showLabel />);
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });

    it("shows correct label for each status", () => {
      const statuses = [
        { status: "synced" as const, label: "Synced" },
        { status: "pending_push" as const, label: "Push Pending" },
        { status: "pending_pull" as const, label: "Pull Pending" },
        { status: "conflict" as const, label: "Conflict" },
        { status: "offline" as const, label: "Offline" },
        { status: "local_only" as const, label: "Local Only" },
      ];

      statuses.forEach(({ status, label }) => {
        const { rerender } = render(
          <SyncStatusBadge status={status} showLabel />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
        rerender(<div />); // Clean up before next iteration
      });
    });
  });

  describe("size variants", () => {
    it("applies sm size classes by default", () => {
      const { container } = render(<SyncStatusBadge status="synced" showLabel />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
      // Text classes are in nested span when showLabel is true
      const textSpan = badge?.querySelector("span");
      expect(textSpan).toHaveClass("text-xs");
    });

    it("applies md size classes when specified", () => {
      const { container } = render(
        <SyncStatusBadge status="synced" size="md" showLabel />
      );
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("px-2.5");
      expect(badge).toHaveClass("py-1");
      // Text classes are in nested span when showLabel is true
      const textSpan = badge?.querySelector("span");
      expect(textSpan).toHaveClass("text-sm");
    });
  });

  describe("onClick behavior", () => {
    it("renders as button when onClick is provided", () => {
      render(<SyncStatusBadge status="synced" onClick={vi.fn()} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("does not render as button when onClick is not provided", () => {
      render(<SyncStatusBadge status="synced" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<SyncStatusBadge status="synced" onClick={handleClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("shows title attribute when clickable", () => {
      render(<SyncStatusBadge status="synced" onClick={vi.fn()} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", "Sync Status: Synced");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <SyncStatusBadge status="synced" className="custom-class" />
      );
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("custom-class");
    });
  });
});
