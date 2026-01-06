import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnlinkRepositoryModal } from "../UnlinkRepositoryModal";
import * as gitOps from "../../../services/gitOperations";
import { api } from "../../../api/client";

// Mock git operations
vi.mock("../../../services/gitOperations", () => ({
  removeRemote: vi.fn(),
}));

// Mock API client
vi.mock("../../../api/client", () => ({
  api: {
    github: {
      deleteGithubRepo: vi.fn(),
    },
  },
}));

describe("UnlinkRepositoryModal", () => {
  const defaultProps = {
    repoDir: "/path/to/repo",
    repoFullName: "user/test-repo",
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render modal with Unlink Repository title", () => {
    render(<UnlinkRepositoryModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Unlink Repository" })
    ).toBeInTheDocument();
  });

  it("should show the linked repository name", () => {
    render(<UnlinkRepositoryModal {...defaultProps} />);

    expect(screen.getByText("Currently linked to:")).toBeInTheDocument();
    expect(screen.getByText("user/test-repo")).toBeInTheDocument();
  });

  it("should have unlink only option selected by default", () => {
    render(<UnlinkRepositoryModal {...defaultProps} />);

    const unlinkOnlyRadio = screen.getByLabelText(/Unlink only/i);
    expect(unlinkOnlyRadio).toBeChecked();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<UnlinkRepositoryModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<UnlinkRepositoryModal {...defaultProps} onCancel={onCancel} />);

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe("Unlink only mode", () => {
    it("should remove remote and call onSuccess when unlink button is clicked", async () => {
      vi.mocked(gitOps.removeRemote).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<UnlinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

      await waitFor(() => {
        expect(gitOps.removeRemote).toHaveBeenCalledWith("/path/to/repo");
        expect(api.github.deleteGithubRepo).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should show error when unlink fails", async () => {
      vi.mocked(gitOps.removeRemote).mockRejectedValue(
        new Error("Failed to remove remote")
      );

      render(<UnlinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to remove remote")).toBeInTheDocument();
      });
    });
  });

  describe("Unlink and delete mode", () => {
    it("should show confirmation input when delete option is selected", () => {
      render(<UnlinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));

      expect(screen.getByText(/Type/)).toBeInTheDocument();
      expect(screen.getByText("test-repo")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("test-repo")).toBeInTheDocument();
    });

    it("should disable submit button until repo name is typed", () => {
      render(<UnlinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));

      const submitButton = screen.getByRole("button", { name: /Delete & Unlink/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when correct repo name is typed", () => {
      render(<UnlinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));

      const confirmInput = screen.getByPlaceholderText("test-repo");
      fireEvent.change(confirmInput, { target: { value: "test-repo" } });

      const submitButton = screen.getByRole("button", { name: /Delete & Unlink/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should delete repo and remove remote when confirmed", async () => {
      vi.mocked(api.github.deleteGithubRepo).mockResolvedValue(undefined);
      vi.mocked(gitOps.removeRemote).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<UnlinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));

      const confirmInput = screen.getByPlaceholderText("test-repo");
      fireEvent.change(confirmInput, { target: { value: "test-repo" } });

      fireEvent.click(screen.getByRole("button", { name: /Delete & Unlink/i }));

      await waitFor(() => {
        expect(api.github.deleteGithubRepo).toHaveBeenCalledWith({
          owner: "user",
          repo: "test-repo",
        });
        expect(gitOps.removeRemote).toHaveBeenCalledWith("/path/to/repo");
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should show error when delete fails", async () => {
      vi.mocked(api.github.deleteGithubRepo).mockRejectedValue(
        new Error("No permission to delete repository")
      );

      render(<UnlinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));

      const confirmInput = screen.getByPlaceholderText("test-repo");
      fireEvent.change(confirmInput, { target: { value: "test-repo" } });

      fireEvent.click(screen.getByRole("button", { name: /Delete & Unlink/i }));

      await waitFor(() => {
        expect(screen.getByText("No permission to delete repository")).toBeInTheDocument();
      });
    });

    it("should clear confirmation input when switching back to unlink only", () => {
      render(<UnlinkRepositoryModal {...defaultProps} />);

      // Switch to delete mode and type something
      fireEvent.click(screen.getByLabelText(/Unlink and delete from GitHub/i));
      const confirmInput = screen.getByPlaceholderText("test-repo");
      fireEvent.change(confirmInput, { target: { value: "test" } });

      // Switch back to unlink only
      fireEvent.click(screen.getByLabelText(/Unlink only/i));

      // Confirmation input should not be visible
      expect(screen.queryByPlaceholderText("test-repo")).not.toBeInTheDocument();
    });
  });
});
