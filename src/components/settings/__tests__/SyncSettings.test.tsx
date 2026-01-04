import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SyncSettings } from "../SyncSettings";
import * as githubConnection from "../../../services/githubConnection";

// Mock the services
vi.mock("../../../services/githubConnection");

// Mock useProject hook
vi.mock("../../../contexts", () => ({
  useProject: () => ({
    currentProject: {
      id: "test-project",
      localPath: "/test/project/path",
    },
  }),
}));

// Mock GitHubConnectCard component
vi.mock("../../sync/GitHubConnectCard", () => ({
  GitHubConnectCard: ({
    onConnect,
  }: {
    onConnect: (url: string) => Promise<void>;
  }) => (
    <div data-testid="github-connect-card">
      <button
        onClick={() => onConnect("https://github.com/test/repo")}
        data-testid="connect-button"
      >
        Connect GitHub
      </button>
    </div>
  ),
}));

describe("SyncSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("when GitHub is not connected", () => {
    beforeEach(() => {
      vi.mocked(githubConnection.getGitHubStatus).mockReturnValue({
        isConnected: false,
      });
    });

    it("should render the connect card", () => {
      render(<SyncSettings />);

      expect(screen.getByTestId("github-connect-card")).toBeInTheDocument();
      expect(screen.getByText("GitHub Connection")).toBeInTheDocument();
    });

    it("should call connectGitHub when connect button is clicked", async () => {
      vi.mocked(githubConnection.connectGitHub).mockResolvedValue();

      render(<SyncSettings />);

      const connectButton = screen.getByTestId("connect-button");
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(githubConnection.connectGitHub).toHaveBeenCalled();
      });
    });

    it("should show error when connection fails", async () => {
      vi.mocked(githubConnection.connectGitHub).mockRejectedValue(
        new Error("Connection failed")
      );

      render(<SyncSettings />);

      const connectButton = screen.getByTestId("connect-button");
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
      });
    });

    it("should not show auto-sync preference", () => {
      render(<SyncSettings />);

      expect(
        screen.queryByText(/Auto-sync on file changes/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("when GitHub is connected", () => {
    beforeEach(() => {
      vi.mocked(githubConnection.getGitHubStatus).mockReturnValue({
        isConnected: true,
        username: "testuser",
        avatarUrl: "https://github.com/avatar.png",
        connectedAt: new Date("2024-01-01"),
      });
    });

    it("should render connected status", () => {
      render(<SyncSettings />);

      expect(screen.getByText("Connected")).toBeInTheDocument();
      expect(screen.getByText("@testuser")).toBeInTheDocument();
      expect(screen.getByText(/Connected on/i)).toBeInTheDocument();
    });

    it("should render disconnect button", () => {
      render(<SyncSettings />);

      expect(screen.getByText("Disconnect GitHub")).toBeInTheDocument();
    });

    it("should show confirmation modal before disconnect", async () => {
      render(<SyncSettings />);

      const disconnectButton = screen.getByText("Disconnect GitHub");
      fireEvent.click(disconnectButton);

      // Modal should appear
      expect(screen.getByRole("heading", { name: "Disconnect GitHub" })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to disconnect/)).toBeInTheDocument();
      expect(githubConnection.disconnectGitHub).not.toHaveBeenCalled();
    });

    it("should not disconnect when cancelled", async () => {
      render(<SyncSettings />);

      const disconnectButton = screen.getByText("Disconnect GitHub");
      fireEvent.click(disconnectButton);

      // Click cancel button in modal
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      // Modal should close and disconnect should not be called
      expect(screen.queryByRole("heading", { name: "Disconnect GitHub" })).not.toBeInTheDocument();
      expect(githubConnection.disconnectGitHub).not.toHaveBeenCalled();
    });

    it("should disconnect when confirmed", async () => {
      vi.mocked(githubConnection.disconnectGitHub).mockResolvedValue();

      render(<SyncSettings />);

      const disconnectButton = screen.getByText("Disconnect GitHub");
      fireEvent.click(disconnectButton);

      // Click disconnect button in modal
      const confirmButton = screen.getByRole("button", { name: "Disconnect" });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(githubConnection.disconnectGitHub).toHaveBeenCalled();
      });
    });

    it("should show auto-sync toggle", () => {
      render(<SyncSettings />);

      expect(
        screen.getByText(/Auto-sync on file changes/i)
      ).toBeInTheDocument();
    });

    it("should toggle auto-sync preference", () => {
      render(<SyncSettings />);

      const toggle = screen.getByRole("checkbox") as HTMLInputElement;
      expect(toggle.checked).toBe(true); // Default is enabled

      fireEvent.click(toggle);

      expect(toggle.checked).toBe(false);
      expect(localStorage.getItem("specflux:sync:autoSync")).toBe("false");

      fireEvent.click(toggle);

      expect(toggle.checked).toBe(true);
      expect(localStorage.getItem("specflux:sync:autoSync")).toBe("true");
    });

    it("should load saved auto-sync preference", () => {
      localStorage.setItem("specflux:sync:autoSync", "false");

      render(<SyncSettings />);

      const toggle = screen.getByRole("checkbox") as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    it("should render GitHub profile link", () => {
      render(<SyncSettings />);

      const profileLink = screen.getByText("View Profile").closest("a");
      expect(profileLink).toHaveAttribute(
        "href",
        "https://github.com/testuser"
      );
      expect(profileLink).toHaveAttribute("target", "_blank");
    });
  });

  describe("error handling", () => {
    it("should show error when disconnect fails", async () => {
      vi.mocked(githubConnection.getGitHubStatus).mockReturnValue({
        isConnected: true,
        username: "testuser",
      });
      vi.mocked(githubConnection.disconnectGitHub).mockRejectedValue(
        new Error("Disconnect failed")
      );

      render(<SyncSettings />);

      // Open the confirmation modal
      const disconnectButton = screen.getByText("Disconnect GitHub");
      fireEvent.click(disconnectButton);

      // Click disconnect in modal
      const confirmButton = screen.getByRole("button", { name: "Disconnect" });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Disconnect failed")).toBeInTheDocument();
      });
    });
  });

  describe("info section", () => {
    it("should always show info about GitHub sync", () => {
      render(<SyncSettings />);

      expect(screen.getByText("About GitHub Sync")).toBeInTheDocument();
      expect(
        screen.getByText(/SpecFlux uses GitHub to store your project code/i)
      ).toBeInTheDocument();
    });
  });
});
