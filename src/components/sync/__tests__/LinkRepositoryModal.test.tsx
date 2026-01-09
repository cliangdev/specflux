import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinkRepositoryModal } from "../LinkRepositoryModal";
import * as gitOps from "../../../services/gitOperations";
import { api } from "../../../api/client";

// Mock git operations
vi.mock("../../../services/gitOperations", () => ({
  setRemoteUrl: vi.fn(),
  getRemoteUrl: vi.fn(),
}));

// Mock API client
vi.mock("../../../api/client", () => ({
  api: {
    github: {
      listGithubRepos: vi.fn(),
      createGithubRepo: vi.fn(),
    },
  },
}));

describe("LinkRepositoryModal", () => {
  const defaultProps = {
    repoDir: "/path/to/repo",
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing repos
    vi.mocked(api.github.listGithubRepos).mockResolvedValue({
      repos: [],
      totalCount: 0,
      page: 1,
      perPage: 100,
    });
    // Default: no existing remote
    vi.mocked(gitOps.getRemoteUrl).mockResolvedValue(undefined);
  });

  it("should render modal with Link Repository title", () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Link Repository" })
    ).toBeInTheDocument();
  });

  it("should show pre-populated repo name from project path", async () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    const repoNameInput = screen.getByPlaceholderText("my-project") as HTMLInputElement;
    expect(repoNameInput).toBeInTheDocument();
    expect(repoNameInput.value).toBe("specflux-repo-spec");
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

  describe("when repo does not exist", () => {
    beforeEach(() => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [],
        totalCount: 0,
        page: 1,
        perPage: 100,
      });
    });

    it("should show visibility options", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Visibility")).toBeInTheDocument();
        expect(screen.getByLabelText(/Private/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Public/i)).toBeInTheDocument();
      });
    });

    it("should show description field", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Description (optional)")).toBeInTheDocument();
      });
    });

    it("should show 'Create & Link' button", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Create & Link/i })).toBeInTheDocument();
      });
    });

    it("should create repo and set remote on submit", async () => {
      vi.mocked(api.github.createGithubRepo).mockResolvedValue({
        id: 123,
        name: "test-repo",
        fullName: "user/test-repo",
        _private: true,
        htmlUrl: "https://github.com/user/test-repo",
        cloneUrl: "https://github.com/user/test-repo.git",
      });
      vi.mocked(gitOps.setRemoteUrl).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<LinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Create & Link/i })).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "test-repo" } });

      fireEvent.click(screen.getByRole("button", { name: /Create & Link/i }));

      await waitFor(() => {
        expect(api.github.createGithubRepo).toHaveBeenCalledWith({
          createGithubRepoRequest: {
            name: "test-repo",
            description: undefined,
            _private: true,
          },
        });
        expect(gitOps.setRemoteUrl).toHaveBeenCalledWith(
          "/path/to/repo",
          "https://github.com/user/test-repo.git"
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("when repo exists", () => {
    beforeEach(() => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [
          {
            id: 1,
            name: "existing-repo",
            fullName: "user/existing-repo",
            _private: true,
            htmlUrl: "https://github.com/user/existing-repo",
            cloneUrl: "https://github.com/user/existing-repo.git",
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 100,
      });
    });

    it("should show 'Repository exists' indicator when name matches", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "existing-repo" } });

      await waitFor(() => {
        expect(screen.getByText("Repository exists")).toBeInTheDocument();
        expect(screen.getByText(/user\/existing-repo/)).toBeInTheDocument();
      });
    });

    it("should hide visibility options when repo exists", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "existing-repo" } });

      await waitFor(() => {
        expect(screen.getByText("Repository exists")).toBeInTheDocument();
      });

      expect(screen.queryByText("Visibility")).not.toBeInTheDocument();
    });

    it("should show 'Link' button when repo exists", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "existing-repo" } });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
      });
    });

    it("should link to existing repo without creating", async () => {
      vi.mocked(gitOps.setRemoteUrl).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<LinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "existing-repo" } });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Link" }));

      await waitFor(() => {
        expect(api.github.createGithubRepo).not.toHaveBeenCalled();
        expect(gitOps.setRemoteUrl).toHaveBeenCalledWith(
          "/path/to/repo",
          "https://github.com/user/existing-repo.git"
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  it("should show error when create fails", async () => {
    vi.mocked(api.github.createGithubRepo).mockRejectedValue(
      new Error("Repository already exists")
    );

    render(<LinkRepositoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create & Link/i })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("my-project");
    fireEvent.change(input, { target: { value: "test-repo" } });

    fireEvent.click(screen.getByRole("button", { name: /Create & Link/i }));

    await waitFor(() => {
      expect(screen.getByText("Repository already exists")).toBeInTheDocument();
    });
  });

  it("should toggle visibility between private and public", async () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create & Link/i })).toBeInTheDocument();
    });

    const privateRadio = screen.getByLabelText(/Private/i);
    const publicRadio = screen.getByLabelText(/Public/i);

    expect(privateRadio).toBeChecked();
    expect(publicRadio).not.toBeChecked();

    fireEvent.click(publicRadio);

    expect(privateRadio).not.toBeChecked();
    expect(publicRadio).toBeChecked();
  });

  it("should disable submit button when repo name is empty", async () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create & Link/i })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("my-project");
    fireEvent.change(input, { target: { value: "" } });

    const submitButton = screen.getByRole("button", { name: /Create & Link/i });
    expect(submitButton).toBeDisabled();
  });
});
