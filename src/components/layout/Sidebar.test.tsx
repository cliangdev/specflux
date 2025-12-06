import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "specflux-sidebar";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders all navigation links", () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByRole("link", { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /roadmap/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders correct href for each link", () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByRole("link", { name: /board/i })).toHaveAttribute(
      "href",
      "/board",
    );
    expect(screen.getByRole("link", { name: /tasks/i })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: /roadmap/i })).toHaveAttribute(
      "href",
      "/roadmap",
    );
    expect(screen.getByRole("link", { name: /files/i })).toHaveAttribute(
      "href",
      "/files",
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders navigation element", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  describe("collapsible functionality", () => {
    it("renders collapse button when expanded", () => {
      renderWithRouter(<Sidebar />);
      expect(
        screen.getByRole("button", { name: /collapse sidebar/i }),
      ).toBeInTheDocument();
    });

    it("collapses to hamburger icon when collapse button is clicked", () => {
      renderWithRouter(<Sidebar />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse sidebar/i,
      });
      fireEvent.click(collapseButton);

      // After collapse, should show expand button (hamburger)
      expect(
        screen.getByRole("button", { name: /expand sidebar/i }),
      ).toBeInTheDocument();
    });

    it("expands when hamburger icon is clicked", () => {
      // Start collapsed
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ width: 256, collapsed: true }),
      );
      renderWithRouter(<Sidebar />);

      const expandButton = screen.getByRole("button", {
        name: /expand sidebar/i,
      });
      fireEvent.click(expandButton);

      // After expand, should show collapse button
      expect(
        screen.getByRole("button", { name: /collapse sidebar/i }),
      ).toBeInTheDocument();
    });

    it("shows icons only when collapsed", () => {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ width: 256, collapsed: true }),
      );
      renderWithRouter(<Sidebar />);

      // Links should still be navigable but with title attributes
      const boardLink = screen.getByRole("link", { name: /board/i });
      expect(boardLink).toHaveAttribute("title", "Board");
    });
  });

  describe("localStorage persistence", () => {
    it("persists collapsed state to localStorage", () => {
      renderWithRouter(<Sidebar />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse sidebar/i,
      });
      fireEvent.click(collapseButton);

      const stored = JSON.parse(
        localStorage.getItem(SIDEBAR_STORAGE_KEY) || "{}",
      );
      expect(stored.collapsed).toBe(true);
    });

    it("restores collapsed state from localStorage", () => {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ width: 256, collapsed: true }),
      );
      renderWithRouter(<Sidebar />);

      // Should start collapsed
      expect(
        screen.getByRole("button", { name: /expand sidebar/i }),
      ).toBeInTheDocument();
    });

    it("restores width from localStorage", () => {
      const customWidth = 300;
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ width: customWidth, collapsed: false }),
      );
      renderWithRouter(<Sidebar />);

      const sidebar = screen.getByRole("complementary");
      expect(sidebar).toHaveStyle({ width: `${customWidth}px` });
    });
  });

  describe("resizable functionality", () => {
    it("renders resize handle when expanded", () => {
      renderWithRouter(<Sidebar />);
      expect(
        screen.getByLabelText(/resize sidebar/i),
      ).toBeInTheDocument();
    });

    it("does not render resize handle when collapsed", () => {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ width: 256, collapsed: true }),
      );
      renderWithRouter(<Sidebar />);

      expect(screen.queryByLabelText(/resize sidebar/i)).not.toBeInTheDocument();
    });

    it("limits width to half of screen size", () => {
      // Set window width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1000,
      });

      renderWithRouter(<Sidebar />);
      const resizeHandle = screen.getByLabelText(/resize sidebar/i);

      // Start resize
      fireEvent.mouseDown(resizeHandle);

      // Try to resize beyond half screen width (500px)
      fireEvent.mouseMove(document, { clientX: 600 });
      fireEvent.mouseUp(document);

      const stored = JSON.parse(
        localStorage.getItem(SIDEBAR_STORAGE_KEY) || "{}",
      );
      // Should be capped at half screen width (500px)
      expect(stored.width).toBeLessThanOrEqual(500);
    });

    it("enforces minimum width of 200px", () => {
      renderWithRouter(<Sidebar />);
      const resizeHandle = screen.getByLabelText(/resize sidebar/i);

      // Start resize
      fireEvent.mouseDown(resizeHandle);

      // Try to resize below minimum
      fireEvent.mouseMove(document, { clientX: 100 });
      fireEvent.mouseUp(document);

      const stored = JSON.parse(
        localStorage.getItem(SIDEBAR_STORAGE_KEY) || "{}",
      );
      expect(stored.width).toBeGreaterThanOrEqual(200);
    });
  });
});
