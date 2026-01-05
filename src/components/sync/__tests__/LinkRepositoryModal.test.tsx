import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinkRepositoryModal } from "../LinkRepositoryModal";
import * as gitOps from "../../../services/gitOperations";
import { api } from "../../../api/client";

// Mock git operations
vi.mock("../../../services/gitOperations", () => ({
  setRemoteUrl: vi.fn(),
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
    // Default: no existing repos (so no conflicts)
    vi.mocked(api.github.listGithubRepos).mockResolvedValue({
      repos: [],
      totalCount: 0,
      page: 1,
      perPage: 100,
    });
  });

  it("should render modal with tabs", () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Link Repository" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create New/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Link Existing/i })).toBeInTheDocument();
  });

  it("should show Create New tab by default with pre-populated repo name", async () => {
    render(<LinkRepositoryModal {...defaultProps} />);

    const repoNameInput = screen.getByPlaceholderText("my-project") as HTMLInputElement;
    expect(repoNameInput).toBeInTheDocument();
    expect(repoNameInput.value).toBe("specflux-repo-spec"); // From "/path/to/repo"
    expect(screen.getByText("Repository Name")).toBeInTheDocument();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
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

  describe("Create New tab", () => {
    it("should enable submit button when repo name is pre-populated", () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      // Submit is enabled because repo name is pre-populated from path
      const submitButton = screen.getByRole("button", { name: /Create & Link/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should disable submit button when repo name is cleared", () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "" } });

      const submitButton = screen.getByRole("button", { name: /Create & Link/i });
      expect(submitButton).toBeDisabled();
    });

    it("should allow changing the pre-populated repo name", () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      const input = screen.getByPlaceholderText("my-project") as HTMLInputElement;
      expect(input.value).toBe("specflux-repo-spec");

      fireEvent.change(input, { target: { value: "custom-name" } });
      expect(input.value).toBe("custom-name");

      const submitButton = screen.getByRole("button", { name: /Create & Link/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should auto-suggest unique name when folder name conflicts with existing repo", async () => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [
          {
            id: 1,
            name: "specflux-repo-spec",
            fullName: "user/specflux-repo-spec",
            _private: true,
            htmlUrl: "https://github.com/user/specflux-repo-spec",
            cloneUrl: "https://github.com/user/specflux-repo-spec.git",
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 100,
      });

      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("my-project") as HTMLInputElement;
        expect(input.value).toBe("specflux-repo-spec-1"); // Should suggest unique name
      });

      // Should show conflict message
      expect(screen.getByText(/A repository named "specflux-repo-spec" already exists/)).toBeInTheDocument();
    });

    it("should increment suffix for multiple conflicts", async () => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [
          {
            id: 1,
            name: "specflux-repo-spec",
            fullName: "user/specflux-repo-spec",
            _private: true,
            htmlUrl: "https://github.com/user/specflux-repo-spec",
            cloneUrl: "https://github.com/user/specflux-repo-spec.git",
          },
          {
            id: 2,
            name: "specflux-repo-spec-1",
            fullName: "user/specflux-repo-spec-1",
            _private: true,
            htmlUrl: "https://github.com/user/specflux-repo-spec-1",
            cloneUrl: "https://github.com/user/specflux-repo-spec-1.git",
          },
        ],
        totalCount: 2,
        page: 1,
        perPage: 100,
      });

      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("my-project") as HTMLInputElement;
        expect(input.value).toBe("specflux-repo-spec-2"); // Should skip -1 and suggest -2
      });
    });

    it("should clear conflict message when user changes repo name", async () => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [
          {
            id: 1,
            name: "specflux-repo-spec",
            fullName: "user/specflux-repo-spec",
            _private: true,
            htmlUrl: "https://github.com/user/specflux-repo-spec",
            cloneUrl: "https://github.com/user/specflux-repo-spec.git",
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 100,
      });

      render(<LinkRepositoryModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/A repository named "specflux-repo-spec" already exists/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "my-custom-name" } });

      expect(screen.queryByText(/A repository named "specflux-repo-spec" already exists/)).not.toBeInTheDocument();
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

    it("should show error when create fails", async () => {
      vi.mocked(api.github.createGithubRepo).mockRejectedValue(
        new Error("Repository already exists")
      );

      render(<LinkRepositoryModal {...defaultProps} />);

      const input = screen.getByPlaceholderText("my-project");
      fireEvent.change(input, { target: { value: "test-repo" } });

      fireEvent.click(screen.getByRole("button", { name: /Create & Link/i }));

      await waitFor(() => {
        expect(screen.getByText("Repository already exists")).toBeInTheDocument();
      });
    });

    it("should toggle visibility between private and public", () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      // Private is selected by default
      const privateRadio = screen.getByLabelText(/Private/i);
      const publicRadio = screen.getByLabelText(/Public/i);

      expect(privateRadio).toBeChecked();
      expect(publicRadio).not.toBeChecked();

      // Click public
      fireEvent.click(publicRadio);

      expect(privateRadio).not.toBeChecked();
      expect(publicRadio).toBeChecked();
    });
  });

  describe("Link Existing tab", () => {
    beforeEach(() => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [
          {
            id: 1,
            name: "repo-one",
            fullName: "user/repo-one",
            _private: false,
            htmlUrl: "https://github.com/user/repo-one",
            cloneUrl: "https://github.com/user/repo-one.git",
            description: "First repository",
          },
          {
            id: 2,
            name: "repo-two",
            fullName: "user/repo-two",
            _private: true,
            htmlUrl: "https://github.com/user/repo-two",
            cloneUrl: "https://github.com/user/repo-two.git",
          },
        ],
        totalCount: 2,
        page: 1,
        perPage: 30,
      });
    });

    it("should load repos when Link Existing tab is clicked", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(api.github.listGithubRepos).toHaveBeenCalled();
        expect(screen.getByText("user/repo-one")).toBeInTheDocument();
        expect(screen.getByText("user/repo-two")).toBeInTheDocument();
      });
    });

    it("should show repo descriptions", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("First repository")).toBeInTheDocument();
      });
    });

    it("should filter repos by search query", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("user/repo-one")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "two" } });

      expect(screen.queryByText("user/repo-one")).not.toBeInTheDocument();
      expect(screen.getByText("user/repo-two")).toBeInTheDocument();
    });

    it("should disable submit button when no repo is selected", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("user/repo-one")).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: "Link Repository" });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when repo is selected", async () => {
      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("user/repo-one")).toBeInTheDocument();
      });

      // Select repo-one
      fireEvent.click(screen.getByText("user/repo-one"));

      const submitButton = screen.getByRole("button", { name: "Link Repository" });
      expect(submitButton).not.toBeDisabled();
    });

    it("should set remote when existing repo is linked", async () => {
      vi.mocked(gitOps.setRemoteUrl).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<LinkRepositoryModal {...defaultProps} onSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("user/repo-one")).toBeInTheDocument();
      });

      // Select repo-one
      fireEvent.click(screen.getByText("user/repo-one"));

      // Click Link Repository
      fireEvent.click(screen.getByRole("button", { name: "Link Repository" }));

      await waitFor(() => {
        expect(gitOps.setRemoteUrl).toHaveBeenCalledWith(
          "/path/to/repo",
          "https://github.com/user/repo-one.git"
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should show error when loading repos fails", async () => {
      vi.mocked(api.github.listGithubRepos).mockRejectedValue(
        new Error("Failed to load repositories")
      );

      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to load repositories")).toBeInTheDocument();
      });
    });

    it("should show message when no repos found", async () => {
      vi.mocked(api.github.listGithubRepos).mockResolvedValue({
        repos: [],
        totalCount: 0,
        page: 1,
        perPage: 30,
      });

      render(<LinkRepositoryModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Link Existing/i }));

      await waitFor(() => {
        expect(screen.getByText("No repositories found")).toBeInTheDocument();
      });
    });
  });
});
