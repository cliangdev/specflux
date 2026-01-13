import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoSyncIndicator } from "../AutoSyncIndicator";
import type { AutoSyncStatus } from "../../../hooks/useAutoSync";

describe("AutoSyncIndicator", () => {
  describe("visibility", () => {
    it("does not render when status is disabled", () => {
      const { container } = render(
        <AutoSyncIndicator status="disabled" isOnline={true} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders when status is watching", () => {
      render(<AutoSyncIndicator status="watching" isOnline={true} />);
      expect(screen.getByTitle("Cloud sync enabled")).toBeInTheDocument();
    });

    it("renders when status is pending", () => {
      render(<AutoSyncIndicator status="pending" isOnline={true} />);
      expect(screen.getByTitle("Changes pending...")).toBeInTheDocument();
    });

    it("renders when status is synced", () => {
      render(<AutoSyncIndicator status="synced" isOnline={true} />);
      expect(screen.getByTitle("All changes synced")).toBeInTheDocument();
    });

    it("renders when status is committing", () => {
      render(<AutoSyncIndicator status="committing" isOnline={true} />);
      expect(screen.getByTitle("Saving changes...")).toBeInTheDocument();
    });

    it("renders when status is pushing", () => {
      render(<AutoSyncIndicator status="pushing" isOnline={true} />);
      expect(screen.getByTitle("Syncing to cloud...")).toBeInTheDocument();
    });

    it("renders when status is pulling", () => {
      render(<AutoSyncIndicator status="pulling" isOnline={true} />);
      expect(screen.getByTitle("Getting updates...")).toBeInTheDocument();
    });

    it("renders when status is offline", () => {
      render(<AutoSyncIndicator status="offline" isOnline={false} />);
      expect(
        screen.getByTitle("Offline - changes saved locally")
      ).toBeInTheDocument();
    });

    it("renders when status is conflict", () => {
      render(<AutoSyncIndicator status="conflict" isOnline={true} />);
      expect(
        screen.getByTitle("Sync conflict - click to resolve")
      ).toBeInTheDocument();
    });

    it("renders when status is error", () => {
      render(<AutoSyncIndicator status="error" isOnline={true} />);
      expect(screen.getByTitle("Sync error")).toBeInTheDocument();
    });
  });

  describe("color styling", () => {
    it("applies emerald color for watching state", () => {
      const { container } = render(
        <AutoSyncIndicator status="watching" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-emerald-500");
    });

    it("applies emerald color for synced state", () => {
      const { container } = render(
        <AutoSyncIndicator status="synced" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-emerald-500");
    });

    it("applies amber color for pending state", () => {
      const { container } = render(
        <AutoSyncIndicator status="pending" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-amber-500");
    });

    it("applies accent color for committing state", () => {
      const { container } = render(
        <AutoSyncIndicator status="committing" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-accent-500");
    });

    it("applies red color for conflict state", () => {
      const { container } = render(
        <AutoSyncIndicator status="conflict" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-red-500");
    });

    it("applies red color for error state", () => {
      const { container } = render(
        <AutoSyncIndicator status="error" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-red-500");
    });
  });

  describe("animation", () => {
    it("applies spin animation for committing state", () => {
      const { container } = render(
        <AutoSyncIndicator status="committing" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("animate-spin");
    });

    it("applies spin animation for pushing state", () => {
      const { container } = render(
        <AutoSyncIndicator status="pushing" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("animate-spin");
    });

    it("applies spin animation for pulling state", () => {
      const { container } = render(
        <AutoSyncIndicator status="pulling" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("animate-spin");
    });

    it("does not apply spin animation for synced state", () => {
      const { container } = render(
        <AutoSyncIndicator status="synced" isOnline={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).not.toHaveClass("animate-spin");
    });
  });

  describe("text labels", () => {
    it("shows Conflict text for conflict status", () => {
      render(<AutoSyncIndicator status="conflict" isOnline={true} />);
      expect(screen.getByText("Conflict")).toBeInTheDocument();
    });

    it("shows Error text for error status", () => {
      render(<AutoSyncIndicator status="error" isOnline={true} />);
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("does not show text label for synced status", () => {
      render(<AutoSyncIndicator status="synced" isOnline={true} />);
      expect(screen.queryByText("Synced")).not.toBeInTheDocument();
    });
  });

  describe("offline override", () => {
    it("shows offline indicator when isOnline is false regardless of status", () => {
      render(<AutoSyncIndicator status="pending" isOnline={false} />);
      expect(
        screen.getByTitle("Offline - changes saved locally")
      ).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <AutoSyncIndicator
          status="synced"
          isOnline={true}
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
