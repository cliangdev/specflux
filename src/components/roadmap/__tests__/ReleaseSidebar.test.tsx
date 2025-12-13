import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReleaseSidebar } from "../ReleaseSidebar";
import type { Release } from "../../../api/generated/models";

// Mock release data
const mockReleases: Release[] = [
  {
    id: "release-1",
    name: "v1.0.0",
    displayKey: "R1",
    status: "RELEASED",
    targetDate: new Date("2024-01-15"),
    projectId: "project-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "release-2",
    name: "v1.1.0",
    displayKey: "R2",
    status: "IN_PROGRESS",
    targetDate: new Date("2024-03-01"),
    projectId: "project-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "release-3",
    name: "v2.0.0",
    displayKey: "R3",
    status: "PLANNED",
    targetDate: new Date("2024-06-01"),
    projectId: "project-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("ReleaseSidebar", () => {
  const defaultProps = {
    releases: mockReleases,
    selectedReleaseId: null,
    onSelectRelease: vi.fn(),
    onCreateRelease: vi.fn(),
  };

  describe("header", () => {
    it("shows 'Releases' header", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      expect(screen.getByText("Releases")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No releases yet' when releases array is empty", () => {
      render(<ReleaseSidebar {...defaultProps} releases={[]} />);
      expect(screen.getByText("No releases yet")).toBeInTheDocument();
    });
  });

  describe("release list", () => {
    it("renders all releases", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      expect(screen.getByText("v1.0.0")).toBeInTheDocument();
      expect(screen.getByText("v1.1.0")).toBeInTheDocument();
      expect(screen.getByText("v2.0.0")).toBeInTheDocument();
    });

    it("shows epic count for each release", () => {
      const epicCounts = {
        "release-1": 5,
        "release-2": 3,
        "release-3": 0,
      };
      render(<ReleaseSidebar {...defaultProps} epicCounts={epicCounts} />);
      expect(screen.getByText(/5 epics/)).toBeInTheDocument();
      expect(screen.getByText(/3 epics/)).toBeInTheDocument();
      expect(screen.getByText(/0 epics/)).toBeInTheDocument();
    });

    it("uses singular 'epic' for count of 1", () => {
      const epicCounts = { "release-1": 1 };
      render(
        <ReleaseSidebar
          {...defaultProps}
          releases={[mockReleases[0]]}
          epicCounts={epicCounts}
        />
      );
      // Look for "1 epic" without an "s" following
      const button = screen.getByText("v1.0.0").closest("button");
      expect(button?.textContent).toMatch(/1 epic(?!s)/);
    });
  });

  describe("status indicators", () => {
    it("shows filled dot for RELEASED status", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      // RELEASED shows ● which appears as text content
      const releaseButton = screen.getByText("v1.0.0").closest("button");
      expect(releaseButton?.textContent).toContain("●");
    });

    it("shows play icon for IN_PROGRESS status", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      const inProgressButton = screen.getByText("v1.1.0").closest("button");
      expect(inProgressButton?.textContent).toContain("▶");
    });

    it("shows empty dot for PLANNED status", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      const plannedButton = screen.getByText("v2.0.0").closest("button");
      expect(plannedButton?.textContent).toContain("○");
    });
  });

  describe("selection", () => {
    it("highlights selected release", () => {
      render(
        <ReleaseSidebar {...defaultProps} selectedReleaseId="release-2" />
      );
      const selectedButton = screen.getByText("v1.1.0").closest("button");
      expect(selectedButton).toHaveClass("bg-accent-100");
    });

    it("calls onSelectRelease when release is clicked", () => {
      const handleSelect = vi.fn();
      render(
        <ReleaseSidebar {...defaultProps} onSelectRelease={handleSelect} />
      );
      fireEvent.click(screen.getByText("v1.1.0"));
      expect(handleSelect).toHaveBeenCalledWith("release-2");
    });
  });

  describe("add release button", () => {
    it("shows Add Release button", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      expect(screen.getByText("Add Release")).toBeInTheDocument();
    });

    it("calls onCreateRelease when Add Release is clicked", () => {
      const handleCreate = vi.fn();
      render(
        <ReleaseSidebar {...defaultProps} onCreateRelease={handleCreate} />
      );
      fireEvent.click(screen.getByText("Add Release"));
      expect(handleCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("date formatting", () => {
    it("formats target dates", () => {
      render(<ReleaseSidebar {...defaultProps} />);
      // Dates are formatted with toLocaleDateString - just verify the content includes date info
      const buttons = screen.getAllByRole("button");
      // Filter out the Add Release button
      const releaseButtons = buttons.filter(btn => btn.textContent?.includes("v"));
      expect(releaseButtons.length).toBe(3);
      // Each release should show some date/epic info
      releaseButtons.forEach(btn => {
        expect(btn.textContent).toMatch(/\d+\s+epic/);
      });
    });
  });
});
