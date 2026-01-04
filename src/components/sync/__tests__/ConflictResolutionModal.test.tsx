import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConflictResolutionModal } from "../ConflictResolutionModal";

describe("ConflictResolutionModal", () => {
  const mockConflictedFiles = [
    { path: "src/file1.ts", hasLocalChanges: true, hasRemoteChanges: true },
    { path: "src/file2.ts", hasLocalChanges: true, hasRemoteChanges: false },
    { path: "src/file3.ts", hasLocalChanges: false, hasRemoteChanges: true },
  ];

  const defaultProps = {
    conflictedFiles: mockConflictedFiles,
    onClose: vi.fn(),
    onResolve: vi.fn().mockResolvedValue(undefined),
  };

  describe("rendering", () => {
    it("renders modal with title", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      expect(screen.getByText("Resolve Sync Conflicts")).toBeInTheDocument();
    });

    it("shows correct number of conflicted files", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      expect(screen.getByText("3 files have conflicting changes")).toBeInTheDocument();
    });

    it("uses singular when one file", () => {
      render(
        <ConflictResolutionModal
          {...defaultProps}
          conflictedFiles={[mockConflictedFiles[0]]}
        />
      );
      expect(screen.getByText("1 file has conflicting changes")).toBeInTheDocument();
    });

    it("lists all conflicted files", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      expect(screen.getByText("src/file1.ts")).toBeInTheDocument();
      expect(screen.getByText("src/file2.ts")).toBeInTheDocument();
      expect(screen.getByText("src/file3.ts")).toBeInTheDocument();
    });

    it("shows change indicators for each file", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const localChanges = screen.getAllByText("Local changes");
      const remoteChanges = screen.getAllByText("Remote changes");
      expect(localChanges.length).toBe(2); // file1 and file2
      expect(remoteChanges.length).toBe(2); // file1 and file3
    });
  });

  describe("file selection", () => {
    it("selects all files by default", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("allows deselecting files", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");

      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });

    it("allows reselecting files", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");

      fireEvent.click(checkboxes[0]); // Deselect
      expect(checkboxes[0]).not.toBeChecked();

      fireEvent.click(checkboxes[0]); // Reselect
      expect(checkboxes[0]).toBeChecked();
    });

    it("shows warning when no files are selected", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");

      // Deselect all
      checkboxes.forEach((checkbox) => fireEvent.click(checkbox));

      expect(screen.getByText("Select at least one file to resolve")).toBeInTheDocument();
    });
  });

  describe("resolution strategies", () => {
    it("shows all three strategy options", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      expect(screen.getByText("Keep Local Version")).toBeInTheDocument();
      expect(screen.getByText("Keep Remote Version")).toBeInTheDocument();
      expect(screen.getByText("Show Diff & Merge Manually")).toBeInTheDocument();
    });

    it("allows selecting a strategy", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const radios = screen.getAllByRole("radio");

      fireEvent.click(radios[0]); // Select "Keep Local"
      expect(radios[0]).toBeChecked();
    });

    it("shows manual merge notice when selected", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const radios = screen.getAllByRole("radio");

      fireEvent.click(radios[2]); // Select "Manual"
      expect(screen.getByText("This will open your configured diff tool")).toBeInTheDocument();
    });
  });

  describe("resolve button", () => {
    it("is disabled when no strategy is selected", () => {
      render(<ConflictResolutionModal {...defaultProps} />);
      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      expect(resolveButton).toBeDisabled();
    });

    it("is disabled when no files are selected", () => {
      render(<ConflictResolutionModal {...defaultProps} />);

      // Select strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      // Deselect all files
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => fireEvent.click(checkbox));

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      expect(resolveButton).toBeDisabled();
    });

    it("is enabled when strategy and files are selected", () => {
      render(<ConflictResolutionModal {...defaultProps} />);

      // Select strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      expect(resolveButton).toBeEnabled();
    });

    it("calls onResolve with correct parameters", async () => {
      const onResolve = vi.fn().mockResolvedValue(undefined);
      render(<ConflictResolutionModal {...defaultProps} onResolve={onResolve} />);

      // Select strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]); // Keep local

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(onResolve).toHaveBeenCalledWith(
          "keep_local",
          expect.arrayContaining(["src/file1.ts", "src/file2.ts", "src/file3.ts"])
        );
      });
    });

    it("shows loading state while resolving", async () => {
      const onResolve = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<ConflictResolutionModal {...defaultProps} onResolve={onResolve} />);

      // Select strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      fireEvent.click(resolveButton);

      expect(screen.getByText("Resolving...")).toBeInTheDocument();
      expect(resolveButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText("Resolving...")).not.toBeInTheDocument();
      });
    });

    it("shows error when resolution fails", async () => {
      const onResolve = vi.fn().mockRejectedValue(new Error("Resolution failed"));
      render(<ConflictResolutionModal {...defaultProps} onResolve={onResolve} />);

      // Select strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(screen.getByText("Resolution failed")).toBeInTheDocument();
      });
    });

    it("changes text to 'Open Diff Tool' for manual strategy", () => {
      render(<ConflictResolutionModal {...defaultProps} />);

      // Select manual strategy
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[2]);

      expect(screen.getByRole("button", { name: /Open Diff Tool/i })).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(<ConflictResolutionModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getAllByRole("button").find(
        (btn) => btn.querySelector("svg") && !btn.textContent?.includes("Resolve")
      );
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      const { container } = render(
        <ConflictResolutionModal {...defaultProps} onClose={onClose} />
      );

      const backdrop = container.querySelector(".bg-black\\/50");
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when cancel button is clicked", () => {
      const onClose = vi.fn();
      render(<ConflictResolutionModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes modal after successful resolution", async () => {
      const onClose = vi.fn();
      const onResolve = vi.fn().mockResolvedValue(undefined);
      render(
        <ConflictResolutionModal
          {...defaultProps}
          onClose={onClose}
          onResolve={onResolve}
        />
      );

      // Select strategy and resolve
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      const resolveButton = screen.getByRole("button", { name: /Resolve Conflicts/i });
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
