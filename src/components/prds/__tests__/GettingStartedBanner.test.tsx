import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GettingStartedBanner } from "../GettingStartedBanner";

describe("GettingStartedBanner", () => {
  const mockOnDraftWithClaude = vi.fn();
  const mockOnRefineWithClaude = vi.fn();
  const mockOnCreateEpics = vi.fn();
  const mockOnAddDocs = vi.fn();
  const mockOnDismiss = vi.fn();

  const defaultProps = {
    prdId: "prd_123",
    hasDocument: false,
    onDraftWithClaude: mockOnDraftWithClaude,
    onRefineWithClaude: mockOnRefineWithClaude,
    onCreateEpics: mockOnCreateEpics,
    onAddDocs: mockOnAddDocs,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderBanner(props = {}) {
    return render(<GettingStartedBanner {...defaultProps} {...props} />);
  }

  it("renders the banner with title", () => {
    renderBanner();

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("renders instruction text", () => {
    renderBanner();

    expect(screen.getByText("Your PRD has been created. Here are your next steps:")).toBeInTheDocument();
  });

  it("shows 'Draft with Claude' when PRD has no documents", () => {
    renderBanner({ hasDocument: false });

    expect(screen.getByText("Draft with Claude")).toBeInTheDocument();
    expect(screen.getByText("Research and write your PRD")).toBeInTheDocument();
  });

  it("shows 'Refine with Claude' when PRD has documents", () => {
    renderBanner({ hasDocument: true });

    expect(screen.getByText("Refine with Claude")).toBeInTheDocument();
    expect(screen.getByText("Improve and expand your PRD")).toBeInTheDocument();
  });

  it("renders Create Epics button", () => {
    renderBanner();

    expect(screen.getByText("Create Epics")).toBeInTheDocument();
    expect(screen.getByText("Break down into implementable epics")).toBeInTheDocument();
  });

  it("renders Add Documents button", () => {
    renderBanner();

    expect(screen.getByText("Add Documents")).toBeInTheDocument();
    expect(screen.getByText("Attach wireframes or mockups")).toBeInTheDocument();
  });

  it("calls onDraftWithClaude when Draft button is clicked", () => {
    renderBanner({ hasDocument: false });

    fireEvent.click(screen.getByText("Draft with Claude"));

    expect(mockOnDraftWithClaude).toHaveBeenCalled();
  });

  it("calls onRefineWithClaude when Refine button is clicked", () => {
    renderBanner({ hasDocument: true });

    fireEvent.click(screen.getByText("Refine with Claude"));

    expect(mockOnRefineWithClaude).toHaveBeenCalled();
  });

  it("calls onCreateEpics when Create Epics is clicked", () => {
    renderBanner();

    fireEvent.click(screen.getByText("Create Epics"));

    expect(mockOnCreateEpics).toHaveBeenCalled();
  });

  it("calls onAddDocs when Add Documents is clicked", () => {
    renderBanner();

    fireEvent.click(screen.getByText("Add Documents"));

    expect(mockOnAddDocs).toHaveBeenCalled();
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    renderBanner();

    // Find the dismiss button by looking for the X icon
    const dismissButton = screen.getByTitle("Dismiss");
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it("renders three action cards", () => {
    renderBanner();

    const buttons = screen.getAllByRole("button");
    // 3 action cards + 1 dismiss button = 4 buttons
    expect(buttons).toHaveLength(4);
  });

  it("renders rocket emoji in header", () => {
    renderBanner();

    expect(screen.getByText("🚀")).toBeInTheDocument();
  });
});
