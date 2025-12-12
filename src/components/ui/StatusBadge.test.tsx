import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  describe("rendering", () => {
    it("renders with correct label for known status", () => {
      render(<StatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders with formatted label for unknown status", () => {
      render(<StatusBadge status="CUSTOM_STATUS" />);
      // Unknown statuses keep their original format but with underscores replaced
      expect(screen.getByText("CUSTOM STATUS")).toBeInTheDocument();
    });

    it("renders case-insensitively", () => {
      render(<StatusBadge status="in_progress" />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  describe("status colors", () => {
    it("applies gray styles for DRAFT status", () => {
      const { container } = render(<StatusBadge status="DRAFT" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-surface-100");
      expect(badge).toHaveClass("text-surface-600");
    });

    it("applies accent styles for IN_PROGRESS status", () => {
      const { container } = render(<StatusBadge status="IN_PROGRESS" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-accent-100");
      expect(badge).toHaveClass("text-accent-700");
    });

    it("applies amber styles for IN_REVIEW status", () => {
      const { container } = render(<StatusBadge status="IN_REVIEW" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-amber-100");
      expect(badge).toHaveClass("text-amber-700");
    });

    it("applies emerald styles for COMPLETED status", () => {
      const { container } = render(<StatusBadge status="COMPLETED" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-emerald-100");
      expect(badge).toHaveClass("text-emerald-700");
    });

    it("applies red styles for BLOCKED status", () => {
      const { container } = render(<StatusBadge status="BLOCKED" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-red-100");
      expect(badge).toHaveClass("text-red-700");
    });
  });

  describe("status icons", () => {
    it("shows pulsing dot for IN_PROGRESS status", () => {
      const { container } = render(<StatusBadge status="IN_PROGRESS" />);
      const pulsingDot = container.querySelector(".animate-ping");
      expect(pulsingDot).toBeInTheDocument();
    });

    it("shows checkmark for COMPLETED status", () => {
      const { container } = render(<StatusBadge status="COMPLETED" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("shows regular dot for DRAFT status", () => {
      const { container } = render(<StatusBadge status="DRAFT" />);
      const dot = container.querySelector(".rounded-full.bg-current");
      expect(dot).toBeInTheDocument();
    });
  });

  describe("dropdown variant", () => {
    const options = [
      { value: "BACKLOG", label: "Backlog" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "COMPLETED", label: "Completed" },
    ];

    it("shows dropdown caret when variant is dropdown and onChange provided", () => {
      const { container } = render(
        <StatusBadge
          status="BACKLOG"
          variant="dropdown"
          onChange={vi.fn()}
          options={options}
        />
      );
      // Should have chevron icon (SVG with path for down arrow)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("opens dropdown on click", () => {
      render(
        <StatusBadge
          status="BACKLOG"
          variant="dropdown"
          onChange={vi.fn()}
          options={options}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Should show all options (use getAllBy since Backlog appears in both the button and options)
      expect(screen.getAllByText("Backlog")).toHaveLength(2); // Once in button, once in dropdown
      expect(screen.getAllByText("In Progress")).toHaveLength(1);
      expect(screen.getAllByText("Completed")).toHaveLength(1);
    });

    it("calls onChange when option is selected", () => {
      const handleChange = vi.fn();
      render(
        <StatusBadge
          status="BACKLOG"
          variant="dropdown"
          onChange={handleChange}
          options={options}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Click on "In Progress" option
      const inProgressButtons = screen.getAllByRole("button");
      const inProgressOption = inProgressButtons.find((btn) =>
        btn.textContent?.includes("In Progress")
      );
      fireEvent.click(inProgressOption!);

      expect(handleChange).toHaveBeenCalledWith("IN_PROGRESS");
    });

    it("closes dropdown after selection", () => {
      render(
        <StatusBadge
          status="BACKLOG"
          variant="dropdown"
          onChange={vi.fn()}
          options={options}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Click on an option
      const buttons = screen.getAllByRole("button");
      const optionButton = buttons.find((btn) =>
        btn.textContent?.includes("In Progress")
      );
      fireEvent.click(optionButton!);

      // Dropdown should be closed (only the main badge visible, not options list)
      const allButtons = screen.getAllByRole("button");
      expect(allButtons).toHaveLength(1);
    });
  });

  describe("size variants", () => {
    it("applies sm size classes by default", () => {
      const { container } = render(<StatusBadge status="DRAFT" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
    });

    it("applies md size classes when specified", () => {
      const { container } = render(<StatusBadge status="DRAFT" size="md" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("text-sm");
      expect(badge).toHaveClass("px-2.5");
      expect(badge).toHaveClass("py-1");
    });
  });
});
