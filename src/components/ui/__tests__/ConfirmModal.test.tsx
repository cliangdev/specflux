import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmModal } from "../ConfirmModal";

describe("ConfirmModal", () => {
  const defaultProps = {
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("should render title and message", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Confirm Action" })).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
  });

  it("should render default button labels", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("should render custom button labels", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );

    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    // Click the backdrop (the element with aria-hidden="true")
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when close button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    // Close button is the one with the X icon (not Cancel text)
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find(
      (btn) => !btn.textContent?.includes("Cancel") && !btn.textContent?.includes("Confirm")
    );
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should show warning icon for danger variant", () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />);

    // Check for the warning icon container
    const iconContainer = document.querySelector(".bg-red-100");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should apply danger styles to confirm button for danger variant", () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).toHaveClass("bg-red-600");
  });

  it("should disable buttons when loading", () => {
    render(<ConfirmModal {...defaultProps} isLoading={true} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it("should show spinner when loading", () => {
    render(<ConfirmModal {...defaultProps} isLoading={true} />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
