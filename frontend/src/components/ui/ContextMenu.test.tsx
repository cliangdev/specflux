import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuItem,
  TerminalIcon,
  DocumentIcon,
} from "./ContextMenu";

describe("ContextMenu", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders at specified position", () => {
    render(
      <ContextMenu x={100} y={200} onClose={mockOnClose}>
        <ContextMenuItem label="Test Item" onClick={() => {}} />
      </ContextMenu>,
    );

    const menu = screen.getByTestId("context-menu");
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveStyle({ left: "100px", top: "200px" });
  });

  it("renders children", () => {
    render(
      <ContextMenu x={0} y={0} onClose={mockOnClose}>
        <ContextMenuItem label="Item 1" onClick={() => {}} />
        <ContextMenuItem label="Item 2" onClick={() => {}} />
      </ContextMenu>,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("closes on click outside", () => {
    render(
      <div data-testid="outside">
        <ContextMenu x={0} y={0} onClose={mockOnClose}>
          <ContextMenuItem label="Test" onClick={() => {}} />
        </ContextMenu>
      </div>,
    );

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes on Escape key", () => {
    render(
      <ContextMenu x={0} y={0} onClose={mockOnClose}>
        <ContextMenuItem label="Test" onClick={() => {}} />
      </ContextMenu>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes on scroll", () => {
    render(
      <ContextMenu x={0} y={0} onClose={mockOnClose}>
        <ContextMenuItem label="Test" onClick={() => {}} />
      </ContextMenu>,
    );

    fireEvent.scroll(window);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside the menu", () => {
    render(
      <ContextMenu x={0} y={0} onClose={mockOnClose}>
        <ContextMenuItem label="Test" onClick={() => {}} />
      </ContextMenu>,
    );

    const menu = screen.getByTestId("context-menu");
    fireEvent.mouseDown(menu);

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});

describe("ContextMenuItem", () => {
  it("renders label", () => {
    render(<ContextMenuItem label="Test Label" onClick={() => {}} />);

    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("renders with icon", () => {
    render(
      <ContextMenuItem
        icon={<span data-testid="icon">Icon</span>}
        label="With Icon"
        onClick={() => {}}
      />,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("With Icon")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const mockOnClick = vi.fn();
    render(<ContextMenuItem label="Click Me" onClick={mockOnClick} />);

    fireEvent.click(screen.getByText("Click Me"));

    expect(mockOnClick).toHaveBeenCalled();
  });

  it("does not call onClick when disabled", () => {
    const mockOnClick = vi.fn();
    render(<ContextMenuItem label="Disabled" onClick={mockOnClick} disabled />);

    fireEvent.click(screen.getByText("Disabled"));

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it("has disabled styling when disabled", () => {
    render(<ContextMenuItem label="Disabled" onClick={() => {}} disabled />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.className).toContain("cursor-not-allowed");
  });
});

describe("Icons", () => {
  it("renders TerminalIcon", () => {
    render(<TerminalIcon />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders DocumentIcon", () => {
    render(<DocumentIcon />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
