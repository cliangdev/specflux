import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { EpicsSection } from "../EpicsSection";
import type { Epic } from "../../../api";

// Helper to wrap component with router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

// Mock epic data
const mockEpics: Epic[] = [
  {
    id: "epic-1",
    title: "User Authentication",
    displayKey: "PROJ-E1",
    status: "IN_PROGRESS",
    progressPercentage: 50,
    taskStats: { total: 4, done: 2, inProgress: 1, backlog: 1 },
    projectId: "project-1",
    createdById: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "epic-2",
    title: "Dashboard Design",
    displayKey: "PROJ-E2",
    status: "COMPLETED",
    progressPercentage: 100,
    taskStats: { total: 3, done: 3, inProgress: 0, backlog: 0 },
    projectId: "project-1",
    createdById: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("EpicsSection", () => {
  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      const { container } = renderWithRouter(
        <EpicsSection epics={[]} loading={true} />
      );
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("shows 'Epics' header in loading state", () => {
      renderWithRouter(<EpicsSection epics={[]} loading={true} />);
      expect(screen.getByText("Epics")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("returns null when no epics and no onAddEpic handler", () => {
      const { container } = renderWithRouter(
        <EpicsSection epics={[]} loading={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("shows empty message when no epics but has onAddEpic handler", () => {
      renderWithRouter(
        <EpicsSection epics={[]} onAddEpic={vi.fn()} loading={false} />
      );
      expect(screen.getByText("No epics linked to this PRD")).toBeInTheDocument();
    });

    it("shows 'Create first epic' button in empty state", () => {
      const handleAdd = vi.fn();
      renderWithRouter(
        <EpicsSection epics={[]} onAddEpic={handleAdd} loading={false} />
      );
      const createButton = screen.getByText("Create first epic");
      expect(createButton).toBeInTheDocument();
      fireEvent.click(createButton);
      expect(handleAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe("with epics", () => {
    it("displays epic count in header", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      expect(screen.getByText("Epics (2)")).toBeInTheDocument();
    });

    it("renders all epics", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      expect(screen.getByText("PROJ-E1")).toBeInTheDocument();
      expect(screen.getByText("PROJ-E2")).toBeInTheDocument();
    });

    it("displays task counts for epics", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      expect(screen.getByText("2/4 tasks")).toBeInTheDocument();
      expect(screen.getByText("3/3 tasks")).toBeInTheDocument();
    });

    it("shows status badges", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("links to epic detail page", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "/epics/epic-1");
      expect(links[1]).toHaveAttribute("href", "/epics/epic-2");
    });
  });

  describe("add button", () => {
    it("shows + Add button when onAddEpic is provided", () => {
      renderWithRouter(
        <EpicsSection epics={mockEpics} onAddEpic={vi.fn()} />
      );
      expect(screen.getByText("+ Add")).toBeInTheDocument();
    });

    it("hides + Add button when onAddEpic is not provided", () => {
      renderWithRouter(<EpicsSection epics={mockEpics} />);
      expect(screen.queryByText("+ Add")).not.toBeInTheDocument();
    });

    it("calls onAddEpic when + Add button is clicked", () => {
      const handleAdd = vi.fn();
      renderWithRouter(
        <EpicsSection epics={mockEpics} onAddEpic={handleAdd} />
      );
      fireEvent.click(screen.getByText("+ Add"));
      expect(handleAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe("progress bar", () => {
    it("shows progress bar with correct width from progressPercentage", () => {
      const { container } = renderWithRouter(<EpicsSection epics={mockEpics} />);
      const progressBars = container.querySelectorAll('[style*="width"]');
      expect(progressBars.length).toBeGreaterThan(0);
      // First epic has 50% progress
      expect(progressBars[0]).toHaveStyle({ width: "50%" });
      // Second epic has 100% progress
      expect(progressBars[1]).toHaveStyle({ width: "100%" });
    });

    it("calculates progress from taskStats when progressPercentage is undefined", () => {
      const epicsWithoutPercentage: Epic[] = [
        {
          id: "epic-3",
          title: "Test Epic",
          displayKey: "PROJ-E3",
          status: "IN_PROGRESS",
          // progressPercentage is undefined
          taskStats: { total: 4, done: 3, inProgress: 1, backlog: 0 },
          projectId: "project-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const { container } = renderWithRouter(
        <EpicsSection epics={epicsWithoutPercentage} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      // 3/4 = 75%
      expect(progressBar).toHaveStyle({ width: "75%" });
    });

    it("shows 0% progress when no taskStats and no progressPercentage", () => {
      const epicsWithNoData: Epic[] = [
        {
          id: "epic-4",
          title: "Empty Epic",
          displayKey: "PROJ-E4",
          status: "PLANNING",
          // No progressPercentage, no taskStats
          projectId: "project-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const { container } = renderWithRouter(
        <EpicsSection epics={epicsWithNoData} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: "0%" });
    });

    it("shows green bar when progress is 100%", () => {
      const completedEpic: Epic[] = [
        {
          id: "epic-5",
          title: "Done Epic",
          displayKey: "PROJ-E5",
          status: "COMPLETED",
          progressPercentage: 100,
          taskStats: { total: 2, done: 2, inProgress: 0, backlog: 0 },
          projectId: "project-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const { container } = renderWithRouter(
        <EpicsSection epics={completedEpic} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveClass("bg-semantic-success");
    });

    it("shows blue bar when progress is between 1-99%", () => {
      const inProgressEpic: Epic[] = [
        {
          id: "epic-6",
          title: "Partial Epic",
          displayKey: "PROJ-E6",
          status: "IN_PROGRESS",
          progressPercentage: 50,
          projectId: "project-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const { container } = renderWithRouter(
        <EpicsSection epics={inProgressEpic} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveClass("bg-accent-500");
    });
  });
});
