import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitHubConnectCard } from "../GitHubConnectCard";

// Mock the shell plugin
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn(),
  },
}));

describe("GitHubConnectCard", () => {
  const defaultProps = {
    onConnect: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders card with title", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "Connect to GitHub" })).toBeInTheDocument();
    });

    it("shows description", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(
        screen.getByText(
          /Link this project to a GitHub repository to enable sync and version control/i
        )
      ).toBeInTheDocument();
    });

    it("shows all benefit items", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(screen.getByText("Automatic Sync")).toBeInTheDocument();
      expect(screen.getByText("Version Control")).toBeInTheDocument();
      expect(screen.getByText("Backup & Recovery")).toBeInTheDocument();
    });

    it("shows connect button", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Connect to GitHub/i })
      ).toBeInTheDocument();
    });

    it("shows help text about authorization", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(
        screen.getByText(/Clicking the button will open GitHub to authorize/i)
      ).toBeInTheDocument();
    });
  });

  describe("connect button", () => {
    it("is enabled by default", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Connect to GitHub/i });
      expect(button).toBeEnabled();
    });

    it("calls onConnect when clicked", async () => {
      const onConnect = vi.fn().mockResolvedValue(undefined);
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const button = screen.getByRole("button", { name: /Connect to GitHub/i });

      fireEvent.click(button);

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalled();
      });
    });

    it("shows loading state while connecting", async () => {
      const onConnect = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const button = screen.getByRole("button", { name: /Connect to GitHub/i });

      fireEvent.click(button);

      expect(screen.getByText("Connecting...")).toBeInTheDocument();
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
      });
    });

    it("shows error when connection fails", async () => {
      const onConnect = vi
        .fn()
        .mockRejectedValue(new Error("Connection failed"));
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const button = screen.getByRole("button", { name: /Connect to GitHub/i });

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
      });
    });
  });

  describe("detected repository", () => {
    it("shows detected repo when projectPath has GitHub remote", async () => {
      const { Command } = await import("@tauri-apps/plugin-shell");
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "https://github.com/owner/my-repo.git\n",
          stderr: "",
        }),
      } as never);

      render(
        <GitHubConnectCard {...defaultProps} projectPath="/test/project" />
      );

      await waitFor(() => {
        expect(screen.getByText("Detected GitHub Repository")).toBeInTheDocument();
        expect(screen.getByText("owner/my-repo")).toBeInTheDocument();
      });
    });

    it("updates button text when repo is detected", async () => {
      const { Command } = await import("@tauri-apps/plugin-shell");
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "git@github.com:test-owner/test-repo.git\n",
          stderr: "",
        }),
      } as never);

      render(
        <GitHubConnectCard {...defaultProps} projectPath="/test/project" />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Connect test-owner\/test-repo/i })
        ).toBeInTheDocument();
      });
    });

    it("shows help text about detected repo", async () => {
      const { Command } = await import("@tauri-apps/plugin-shell");
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "https://github.com/owner/repo.git\n",
          stderr: "",
        }),
      } as never);

      render(
        <GitHubConnectCard {...defaultProps} projectPath="/test/project" />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/We detected a GitHub remote in your project/i)
        ).toBeInTheDocument();
      });
    });

    it("does not show detected repo when no remote configured", async () => {
      const { Command } = await import("@tauri-apps/plugin-shell");
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          code: 1,
          stdout: "",
          stderr: "fatal: No such remote 'origin'",
        }),
      } as never);

      render(
        <GitHubConnectCard {...defaultProps} projectPath="/test/project" />
      );

      // Wait for the detection to complete
      await waitFor(() => {
        expect(
          screen.queryByText("Detected GitHub Repository")
        ).not.toBeInTheDocument();
      });
    });

    it("does not show detected repo for non-GitHub remotes", async () => {
      const { Command } = await import("@tauri-apps/plugin-shell");
      vi.mocked(Command.create).mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          code: 0,
          stdout: "https://gitlab.com/owner/repo.git\n",
          stderr: "",
        }),
      } as never);

      render(
        <GitHubConnectCard {...defaultProps} projectPath="/test/project" />
      );

      await waitFor(() => {
        expect(
          screen.queryByText("Detected GitHub Repository")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <GitHubConnectCard {...defaultProps} className="custom-class" />
      );
      const card = container.firstChild;
      expect(card).toHaveClass("custom-class");
    });
  });
});
