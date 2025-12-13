import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIActionButton } from "./AIActionButton";

const defaultProps = {
  entityType: "task" as const,
  entityId: "123",
  entityTitle: "Test Task",
  onStartWork: vi.fn(),
};

describe("AIActionButton", () => {
  describe("rendering", () => {
    it("renders Start Work button by default", () => {
      render(<AIActionButton {...defaultProps} />);
      expect(screen.getByText("Start Work")).toBeInTheDocument();
    });

    it("renders Continue Work when hasExistingSession is true", () => {
      render(
        <AIActionButton
          {...defaultProps}
          hasExistingSession
          onContinueWork={vi.fn()}
        />
      );
      expect(screen.getByText("Continue Work")).toBeInTheDocument();
    });

    it("renders dropdown toggle when onContinueWork is provided", () => {
      render(
        <AIActionButton {...defaultProps} onContinueWork={vi.fn()} />
      );
      expect(screen.getByLabelText("More options")).toBeInTheDocument();
    });

    it("does not render dropdown toggle without onContinueWork", () => {
      render(<AIActionButton {...defaultProps} />);
      expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
    });
  });

  describe("active indicator", () => {
    it("shows pulsing indicator when terminal is active", () => {
      const { container } = render(
        <AIActionButton {...defaultProps} isTerminalActive />
      );
      expect(container.querySelector(".animate-ping")).toBeInTheDocument();
    });

    it("does not show indicator when terminal is not active", () => {
      const { container } = render(<AIActionButton {...defaultProps} />);
      expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables button when disabled prop is true", () => {
      render(<AIActionButton {...defaultProps} disabled />);
      expect(screen.getByText("Start Work").closest("button")).toBeDisabled();
    });

    it("disables dropdown toggle when disabled", () => {
      render(
        <AIActionButton
          {...defaultProps}
          onContinueWork={vi.fn()}
          disabled
        />
      );
      expect(screen.getByLabelText("More options")).toBeDisabled();
    });
  });

  describe("actions", () => {
    it("calls onStartWork when Start Work is clicked", () => {
      const handleStartWork = vi.fn();
      render(
        <AIActionButton {...defaultProps} onStartWork={handleStartWork} />
      );

      fireEvent.click(screen.getByText("Start Work"));
      expect(handleStartWork).toHaveBeenCalled();
    });

    it("calls onContinueWork when Continue Work is clicked", () => {
      const handleContinueWork = vi.fn();
      render(
        <AIActionButton
          {...defaultProps}
          hasExistingSession
          onContinueWork={handleContinueWork}
        />
      );

      fireEvent.click(screen.getByText("Continue Work"));
      expect(handleContinueWork).toHaveBeenCalled();
    });
  });

  describe("dropdown menu", () => {
    it("opens dropdown when toggle is clicked", () => {
      render(
        <AIActionButton {...defaultProps} onContinueWork={vi.fn()} />
      );

      fireEvent.click(screen.getByLabelText("More options"));
      expect(screen.getByText("Start New Session")).toBeInTheDocument();
      expect(screen.getByText("Continue Existing Session")).toBeInTheDocument();
    });

    it("calls onStartWork when Start New Session is clicked in dropdown", () => {
      const handleStartWork = vi.fn();
      render(
        <AIActionButton
          {...defaultProps}
          onStartWork={handleStartWork}
          onContinueWork={vi.fn()}
        />
      );

      fireEvent.click(screen.getByLabelText("More options"));
      fireEvent.click(screen.getByText("Start New Session"));

      expect(handleStartWork).toHaveBeenCalled();
    });

    it("calls onContinueWork when Continue Existing Session is clicked in dropdown", () => {
      const handleContinueWork = vi.fn();
      render(
        <AIActionButton
          {...defaultProps}
          onContinueWork={handleContinueWork}
        />
      );

      fireEvent.click(screen.getByLabelText("More options"));
      fireEvent.click(screen.getByText("Continue Existing Session"));

      expect(handleContinueWork).toHaveBeenCalled();
    });

    it("closes dropdown after action is clicked", () => {
      render(
        <AIActionButton {...defaultProps} onContinueWork={vi.fn()} />
      );

      fireEvent.click(screen.getByLabelText("More options"));
      fireEvent.click(screen.getByText("Start New Session"));

      expect(screen.queryByText("Start New Session")).not.toBeInTheDocument();
    });
  });

  describe("sizes", () => {
    it("renders small size", () => {
      const { container } = render(
        <AIActionButton {...defaultProps} size="sm" />
      );
      const button = container.querySelector("button");
      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("py-1.5");
    });

    it("renders medium size by default", () => {
      const { container } = render(<AIActionButton {...defaultProps} />);
      const button = container.querySelector("button");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
    });
  });

  describe("title attribute", () => {
    it("sets title attribute with entity title", () => {
      render(<AIActionButton {...defaultProps} />);
      const button = screen.getByText("Start Work").closest("button");
      expect(button).toHaveAttribute("title", "Start Work on Test Task");
    });

    it("sets title attribute for continue work", () => {
      render(
        <AIActionButton
          {...defaultProps}
          hasExistingSession
          onContinueWork={vi.fn()}
        />
      );
      const button = screen.getByText("Continue Work").closest("button");
      expect(button).toHaveAttribute("title", "Continue Work on Test Task");
    });
  });

  describe("className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <AIActionButton {...defaultProps} className="my-custom-class" />
      );
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });
});
