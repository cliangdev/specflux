import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnlinkRepositoryModal } from "../UnlinkRepositoryModal";
import * as gitOps from "../../../services/gitOperations";

// Mock git operations
vi.mock("../../../services/gitOperations", () => ({
  removeRemote: vi.fn(),
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

  it("should show explanation text", () => {
    render(<UnlinkRepositoryModal {...defaultProps} />);

    expect(
      screen.getByText(/This will remove the connection between this project/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The repository will remain on GitHub/)
    ).toBeInTheDocument();
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

  it("should remove remote and call onSuccess when unlink button is clicked", async () => {
    vi.mocked(gitOps.removeRemote).mockResolvedValue(undefined);

    const onSuccess = vi.fn();
    render(<UnlinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(gitOps.removeRemote).toHaveBeenCalledWith("/path/to/repo");
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

  it("should disable buttons while loading", async () => {
    // Make removeRemote hang
    vi.mocked(gitOps.removeRemote).mockImplementation(
      () => new Promise(() => {})
    );

    render(<UnlinkRepositoryModal {...defaultProps} />);

    const unlinkButton = screen.getByRole("button", { name: "Unlink" });
    fireEvent.click(unlinkButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });
  });
});
