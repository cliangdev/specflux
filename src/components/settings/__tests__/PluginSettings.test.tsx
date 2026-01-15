import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PluginSettings } from "../PluginSettings";
import * as pluginManager from "../../../services/pluginManager";

vi.mock("../../../services/pluginManager");

describe("PluginSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when plugin is installed", () => {
    beforeEach(() => {
      vi.mocked(pluginManager.checkPluginInstalled).mockResolvedValue({
        installed: true,
        version: "1.0.0",
      });
      vi.mocked(pluginManager.checkPluginUpdateAvailable).mockResolvedValue({
        updateAvailable: false,
        installedVersion: "1.0.0",
        bundledVersion: "1.0.0",
      });
    });

    it("should render plugin installed status", async () => {
      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Plugin Installed")).toBeInTheDocument();
        expect(screen.getByText("Version 1.0.0 (latest)")).toBeInTheDocument();
      });
    });

    it("should not show update banner when no update available", async () => {
      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
      });
    });
  });

  describe("when plugin is not installed", () => {
    beforeEach(() => {
      vi.mocked(pluginManager.checkPluginInstalled).mockResolvedValue({
        installed: false,
      });
      vi.mocked(pluginManager.checkPluginUpdateAvailable).mockResolvedValue({
        updateAvailable: true,
        installedVersion: null,
        bundledVersion: "1.0.0",
      });
    });

    it("should render not installed status", async () => {
      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Plugin Not Installed")).toBeInTheDocument();
      });
    });
  });

  describe("when update is available", () => {
    beforeEach(() => {
      vi.mocked(pluginManager.checkPluginInstalled).mockResolvedValue({
        installed: true,
        version: "1.0.0",
      });
      vi.mocked(pluginManager.checkPluginUpdateAvailable).mockResolvedValue({
        updateAvailable: true,
        installedVersion: "1.0.0",
        bundledVersion: "1.1.0",
      });
    });

    it("should show update button with target version", async () => {
      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Update to 1.1.0")).toBeInTheDocument();
      });
    });

    it("should call updatePlugin when update button is clicked", async () => {
      vi.mocked(pluginManager.updatePlugin).mockResolvedValue({
        success: true,
        newVersion: "1.1.0",
      });

      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Update to 1.1.0")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Update to 1.1.0"));

      await waitFor(() => {
        expect(pluginManager.updatePlugin).toHaveBeenCalled();
      });
    });

    it("should show success message after successful update", async () => {
      vi.mocked(pluginManager.updatePlugin).mockResolvedValue({
        success: true,
        newVersion: "1.1.0",
      });

      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Update to 1.1.0")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Update to 1.1.0"));

      await waitFor(() => {
        expect(screen.getByText("Updated to version 1.1.0")).toBeInTheDocument();
      });
    });

    it("should show error message when update fails", async () => {
      vi.mocked(pluginManager.updatePlugin).mockResolvedValue({
        success: false,
        error: "Installation failed",
      });

      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("Update to 1.1.0")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Update to 1.1.0"));

      await waitFor(() => {
        expect(screen.getByText("Installation failed")).toBeInTheDocument();
      });
    });
  });

  describe("info section", () => {
    beforeEach(() => {
      vi.mocked(pluginManager.checkPluginInstalled).mockResolvedValue({
        installed: true,
        version: "1.0.0",
      });
      vi.mocked(pluginManager.checkPluginUpdateAvailable).mockResolvedValue({
        updateAvailable: false,
        installedVersion: "1.0.0",
        bundledVersion: "1.0.0",
      });
    });

    it("should display plugin commands info", async () => {
      render(<PluginSettings />);

      await waitFor(() => {
        expect(screen.getByText("/specflux:planning")).toBeInTheDocument();
        expect(screen.getByText("/specflux:implement")).toBeInTheDocument();
      });
    });
  });
});
