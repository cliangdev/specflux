import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinkRepositoryModal } from "../LinkRepositoryModal";
import * as gitOps from "../../../services/gitOperations";

// Mock git operations
vi.mock("../../../services/gitOperations", () => ({
  setRemoteUrl: vi.fn(),
  parseGitHubUrl: vi.fn(),
}));

describe("LinkRepositoryModal", () => {
  const defaultProps = {
    repoDir: "/path/to/repo",
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: parseGitHubUrl returns undefined (invalid)
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue(undefined);
  });

  it("should render modal with title and input", () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Link Repository" })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://github.com/owner/repo")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link Repository" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<LinkRepositoryModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<LinkRepositoryModal {...defaultProps} onCancel={onCancel} />);

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when close button is clicked", () => {
    const onCancel = vi.fn();
    render(<LinkRepositoryModal {...defaultProps} onCancel={onCancel} />);

    // Close button is the X button in header
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find(
      (btn) =>
        !btn.textContent?.includes("Cancel") &&
        !btn.textContent?.includes("Link Repository")
    );
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should disable submit button when URL is empty", () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Link Repository" });
    expect(submitButton).toBeDisabled();
  });

  it("should disable submit button when URL is invalid", () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue(undefined);

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, { target: { value: "not-a-valid-url" } });

    const submitButton = screen.getByRole("button", { name: "Link Repository" });
    expect(submitButton).toBeDisabled();
  });

  it("should show validation message for valid GitHub URL", () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "https://github.com/octocat/hello-world" },
    });

    expect(screen.getByText("Repository:")).toBeInTheDocument();
    expect(screen.getByText("octocat/hello-world")).toBeInTheDocument();
  });

  it("should show validation message for invalid URL", () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue(undefined);

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, { target: { value: "https://gitlab.com/user/repo" } });

    expect(
      screen.getByText("Please enter a valid GitHub URL (HTTPS or SSH)")
    ).toBeInTheDocument();
  });

  it("should enable submit button when URL is valid", () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "https://github.com/octocat/hello-world" },
    });

    const submitButton = screen.getByRole("button", { name: "Link Repository" });
    expect(submitButton).not.toBeDisabled();
  });

  it("should call setRemoteUrl and onSuccess when form is submitted", async () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });
    vi.mocked(gitOps.setRemoteUrl).mockResolvedValue(undefined);

    const onSuccess = vi.fn();
    render(<LinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "https://github.com/octocat/hello-world" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Link Repository" }));

    await waitFor(() => {
      expect(gitOps.setRemoteUrl).toHaveBeenCalledWith(
        "/path/to/repo",
        "https://github.com/octocat/hello-world"
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("should show error message when setRemoteUrl fails", async () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });
    vi.mocked(gitOps.setRemoteUrl).mockRejectedValue(
      new Error("Failed to add remote")
    );

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "https://github.com/octocat/hello-world" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Link Repository" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to add remote")).toBeInTheDocument();
    });
  });

  it("should trim whitespace from URL", async () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });
    vi.mocked(gitOps.setRemoteUrl).mockResolvedValue(undefined);

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "  https://github.com/octocat/hello-world  " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Link Repository" }));

    await waitFor(() => {
      expect(gitOps.setRemoteUrl).toHaveBeenCalledWith(
        "/path/to/repo",
        "https://github.com/octocat/hello-world"
      );
    });
  });

  it("should show loading state while submitting", async () => {
    vi.mocked(gitOps.parseGitHubUrl).mockReturnValue({
      owner: "octocat",
      repo: "hello-world",
    });
    // Create a promise that we can control
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(gitOps.setRemoteUrl).mockReturnValue(promise);

    render(<LinkRepositoryModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("https://github.com/owner/repo");
    fireEvent.change(input, {
      target: { value: "https://github.com/octocat/hello-world" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Link Repository" }));

    // Should show spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!();

    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
    });
  });
});
