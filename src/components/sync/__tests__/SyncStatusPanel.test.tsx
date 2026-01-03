import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SyncStatusPanel } from "../SyncStatusPanel";

describe("SyncStatusPanel", () => {
  describe("rendering", () => {
    it("renders sync status badge", () => {
      render(<SyncStatusPanel status="synced" />);
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });

    it("shows status description", () => {
      render(<SyncStatusPanel status="synced" />);
      expect(
        screen.getByText("All changes are synchronized with GitHub")
      ).toBeInTheDocument();
    });

    it("shows different descriptions for each status", () => {
      const { rerender } = render(<SyncStatusPanel status="pending_push" />);
      expect(
        screen.getByText("You have local commits that need to be pushed")
      ).toBeInTheDocument();

      rerender(<SyncStatusPanel status="pending_pull" />);
      expect(
        screen.getByText("Remote has new commits that need to be pulled")
      ).toBeInTheDocument();

      rerender(<SyncStatusPanel status="conflict" />);
      expect(
        screen.getByText("Local and remote changes conflict - resolution needed")
      ).toBeInTheDocument();
    });
  });

  describe("last synced timestamp", () => {
    it("displays last synced time when provided", () => {
      const lastSyncedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      render(<SyncStatusPanel status="synced" lastSyncedAt={lastSyncedAt} />);
      expect(screen.getByText("Last synced:")).toBeInTheDocument();
      expect(screen.getByText("5 minutes ago")).toBeInTheDocument();
    });

    it("shows 'just now' for recent syncs", () => {
      const lastSyncedAt = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      render(<SyncStatusPanel status="synced" lastSyncedAt={lastSyncedAt} />);
      expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("does not show last synced for local_only status", () => {
      const lastSyncedAt = new Date();
      render(
        <SyncStatusPanel status="local_only" lastSyncedAt={lastSyncedAt} />
      );
      expect(screen.queryByText("Last synced:")).not.toBeInTheDocument();
    });
  });

  describe("pending changes", () => {
    it("displays number of pending changes", () => {
      render(<SyncStatusPanel status="pending_push" pendingChanges={5} />);
      expect(screen.getByText("Pending changes:")).toBeInTheDocument();
      expect(screen.getByText("5 files")).toBeInTheDocument();
    });

    it("uses singular 'file' for one change", () => {
      render(<SyncStatusPanel status="pending_push" pendingChanges={1} />);
      expect(screen.getByText("1 file")).toBeInTheDocument();
    });

    it("does not show pending changes when zero", () => {
      render(<SyncStatusPanel status="synced" pendingChanges={0} />);
      expect(screen.queryByText("Pending changes:")).not.toBeInTheDocument();
    });
  });

  describe("GitHub link", () => {
    it("shows GitHub link when URL is provided", () => {
      render(
        <SyncStatusPanel
          status="synced"
          githubUrl="https://github.com/owner/repo"
        />
      );
      const link = screen.getByText("View on GitHub");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "https://github.com/owner/repo"
      );
    });

    it("does not show GitHub link when URL is not provided", () => {
      render(<SyncStatusPanel status="synced" />);
      expect(screen.queryByText("View on GitHub")).not.toBeInTheDocument();
    });

    it("opens link in new tab", () => {
      render(
        <SyncStatusPanel
          status="synced"
          githubUrl="https://github.com/owner/repo"
        />
      );
      const link = screen.getByText("View on GitHub").closest("a");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("sync button", () => {
    it("shows sync button when onSync is provided and status is not local_only", () => {
      render(<SyncStatusPanel status="pending_push" onSync={vi.fn()} />);
      expect(screen.getByText("Sync Now")).toBeInTheDocument();
    });

    it("does not show sync button for local_only status", () => {
      render(<SyncStatusPanel status="local_only" onSync={vi.fn()} />);
      expect(screen.queryByText("Sync Now")).not.toBeInTheDocument();
    });

    it("does not show sync button for offline status", () => {
      render(<SyncStatusPanel status="offline" onSync={vi.fn()} />);
      expect(screen.queryByText("Sync Now")).not.toBeInTheDocument();
    });

    it("calls onSync when clicked", async () => {
      const handleSync = vi.fn().mockResolvedValue(undefined);
      render(<SyncStatusPanel status="pending_push" onSync={handleSync} />);

      const button = screen.getByText("Sync Now");
      fireEvent.click(button);

      await waitFor(() => {
        expect(handleSync).toHaveBeenCalledTimes(1);
      });
    });

    it("shows loading state when syncing", async () => {
      const handleSync = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<SyncStatusPanel status="pending_push" onSync={handleSync} />);

      const button = screen.getByText("Sync Now");
      fireEvent.click(button);

      expect(screen.getByText("Syncing...")).toBeInTheDocument();
      expect(button.closest("button")).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText("Syncing...")).not.toBeInTheDocument();
      });
    });

    it("disables sync button when status is synced", () => {
      render(<SyncStatusPanel status="synced" onSync={vi.fn()} />);
      const button = screen.getByText("Sync Now").closest("button");
      expect(button).toBeDisabled();
    });
  });

  describe("conflict resolution button", () => {
    it("shows resolve conflicts button for conflict status", () => {
      render(
        <SyncStatusPanel
          status="conflict"
          onOpenConflictResolution={vi.fn()}
        />
      );
      expect(screen.getByText("Resolve Conflicts")).toBeInTheDocument();
    });

    it("does not show resolve button for non-conflict status", () => {
      render(
        <SyncStatusPanel status="synced" onOpenConflictResolution={vi.fn()} />
      );
      expect(screen.queryByText("Resolve Conflicts")).not.toBeInTheDocument();
    });

    it("calls onOpenConflictResolution when clicked", () => {
      const handleOpen = vi.fn();
      render(
        <SyncStatusPanel status="conflict" onOpenConflictResolution={handleOpen} />
      );

      const button = screen.getByText("Resolve Conflicts");
      fireEvent.click(button);

      expect(handleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("offline notice", () => {
    it("shows offline notice for offline status", () => {
      render(<SyncStatusPanel status="offline" />);
      expect(
        screen.getByText(
          "Changes will be synced automatically when connection is restored."
        )
      ).toBeInTheDocument();
    });

    it("does not show offline notice for other statuses", () => {
      render(<SyncStatusPanel status="synced" />);
      expect(
        screen.queryByText(
          "Changes will be synced automatically when connection is restored."
        )
      ).not.toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <SyncStatusPanel status="synced" className="custom-class" />
      );
      const panel = container.firstChild;
      expect(panel).toHaveClass("custom-class");
    });
  });
});
