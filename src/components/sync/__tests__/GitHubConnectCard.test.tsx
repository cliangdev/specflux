import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitHubConnectCard } from "../GitHubConnectCard";

describe("GitHubConnectCard", () => {
  const defaultProps = {
    onConnect: vi.fn().mockResolvedValue(undefined),
  };

  describe("rendering", () => {
    it("renders card with title", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(screen.getByText("Connect to GitHub")).toBeInTheDocument();
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

    it("shows URL input field", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      expect(input).toBeInTheDocument();
    });

    it("shows connect button", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Connect Repository/i })).toBeInTheDocument();
    });

    it("shows help text about permissions", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      expect(
        screen.getByText(/Make sure you have the necessary permissions/i)
      ).toBeInTheDocument();
    });
  });

  describe("URL input", () => {
    it("allows typing in the input field", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        "https://github.com/owner/repository"
      ) as HTMLInputElement;

      fireEvent.change(input, {
        target: { value: "https://github.com/test/repo" },
      });

      expect(input.value).toBe("https://github.com/test/repo");
    });

    it("clears error when typing", async () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");

      // Type invalid URL to trigger validation error
      fireEvent.change(input, { target: { value: "invalid-url" } });
      const button = screen.getByRole("button", { name: /Connect Repository/i });
      fireEvent.click(button);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Invalid URL format/i)).toBeInTheDocument();
      });

      // Error should clear when typing
      fireEvent.change(input, {
        target: { value: "https://github.com/test/repo" },
      });
      expect(screen.queryByText(/Invalid URL format/i)).not.toBeInTheDocument();
    });
  });

  describe("connect button", () => {
    it("is disabled when URL is empty", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Connect Repository/i });
      expect(button).toBeDisabled();
    });

    it("is enabled when URL is provided", () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, {
        target: { value: "https://github.com/test/repo" },
      });

      expect(button).toBeEnabled();
    });

    it("validates URL format before connecting", async () => {
      render(<GitHubConnectCard {...defaultProps} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, { target: { value: "invalid-url" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Invalid URL format/i)).toBeInTheDocument();
      });
    });

    it("accepts HTTPS GitHub URLs", async () => {
      const onConnect = vi.fn().mockResolvedValue(undefined);
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, {
        target: { value: "https://github.com/owner/repo" },
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith("https://github.com/owner/repo");
      });
    });

    it("accepts SSH GitHub URLs", async () => {
      const onConnect = vi.fn().mockResolvedValue(undefined);
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, {
        target: { value: "git@github.com:owner/repo.git" },
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith("git@github.com:owner/repo.git");
      });
    });

    it("shows loading state while connecting", async () => {
      const onConnect = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, {
        target: { value: "https://github.com/owner/repo" },
      });
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
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");
      const button = screen.getByRole("button", { name: /Connect Repository/i });

      fireEvent.change(input, {
        target: { value: "https://github.com/owner/repo" },
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
      });
    });
  });

  describe("keyboard interaction", () => {
    it("connects on Enter key press", async () => {
      const onConnect = vi.fn().mockResolvedValue(undefined);
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");

      fireEvent.change(input, {
        target: { value: "https://github.com/owner/repo" },
      });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith("https://github.com/owner/repo");
      });
    });

    it("does not connect on other key presses", () => {
      const onConnect = vi.fn();
      render(<GitHubConnectCard {...defaultProps} onConnect={onConnect} />);
      const input = screen.getByPlaceholderText("https://github.com/owner/repository");

      fireEvent.change(input, {
        target: { value: "https://github.com/owner/repo" },
      });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onConnect).not.toHaveBeenCalled();
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
