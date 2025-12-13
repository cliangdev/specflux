import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DetailPageHeader } from "./DetailPageHeader";

const defaultProps = {
  backLabel: "Back to PRDs",
  backTo: "/prds",
  entityKey: "PRD-001",
  title: "Test PRD Title",
  status: "DRAFT",
  statusOptions: [
    { value: "DRAFT", label: "Draft" },
    { value: "IN_REVIEW", label: "In Review" },
    { value: "APPROVED", label: "Approved" },
  ],
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("DetailPageHeader", () => {
  describe("rendering", () => {
    it("renders back button with correct label", () => {
      renderWithRouter(<DetailPageHeader {...defaultProps} />);
      expect(screen.getByText("Back to PRDs")).toBeInTheDocument();
    });

    it("renders entity key in monospace font", () => {
      renderWithRouter(<DetailPageHeader {...defaultProps} />);
      const entityKey = screen.getByText("PRD-001");
      expect(entityKey).toHaveClass("font-mono");
    });

    it("renders title", () => {
      renderWithRouter(<DetailPageHeader {...defaultProps} />);
      expect(screen.getByText("Test PRD Title")).toBeInTheDocument();
    });

    it("renders status badge", () => {
      renderWithRouter(<DetailPageHeader {...defaultProps} />);
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("back button links to correct route", () => {
      renderWithRouter(<DetailPageHeader {...defaultProps} />);
      const backLink = screen.getByText("Back to PRDs").closest("a");
      expect(backLink).toHaveAttribute("href", "/prds");
    });
  });

  describe("title editing", () => {
    it("shows editable title when onTitleChange is provided", () => {
      renderWithRouter(
        <DetailPageHeader {...defaultProps} onTitleChange={vi.fn()} />
      );
      const title = screen.getByText("Test PRD Title");
      expect(title).toHaveClass("cursor-pointer");
    });

    it("enters edit mode when title is clicked", () => {
      renderWithRouter(
        <DetailPageHeader {...defaultProps} onTitleChange={vi.fn()} />
      );
      const title = screen.getByText("Test PRD Title");
      fireEvent.click(title);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("calls onTitleChange when title is edited and submitted", () => {
      const handleTitleChange = vi.fn();
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          onTitleChange={handleTitleChange}
        />
      );

      // Click to edit
      fireEvent.click(screen.getByText("Test PRD Title"));

      // Change the value
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Title" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(handleTitleChange).toHaveBeenCalledWith("New Title");
    });

    it("cancels edit when Escape is pressed", () => {
      renderWithRouter(
        <DetailPageHeader {...defaultProps} onTitleChange={vi.fn()} />
      );

      fireEvent.click(screen.getByText("Test PRD Title"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Title" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Should show original title
      expect(screen.getByText("Test PRD Title")).toBeInTheDocument();
    });
  });

  describe("status dropdown", () => {
    it("shows dropdown variant when onStatusChange is provided", () => {
      renderWithRouter(
        <DetailPageHeader {...defaultProps} onStatusChange={vi.fn()} />
      );
      // Dropdown variant should have a button instead of just a span
      const statusButton = screen.getByRole("button", { name: /draft/i });
      expect(statusButton).toBeInTheDocument();
    });

    it("calls onStatusChange when status is changed", () => {
      const handleStatusChange = vi.fn();
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          onStatusChange={handleStatusChange}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByRole("button", { name: /draft/i }));

      // Click on "In Review"
      const buttons = screen.getAllByRole("button");
      const inReviewButton = buttons.find((btn) =>
        btn.textContent?.includes("In Review")
      );
      fireEvent.click(inReviewButton!);

      expect(handleStatusChange).toHaveBeenCalledWith("IN_REVIEW");
    });
  });

  describe("badges", () => {
    it("renders context badges", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          badges={[{ label: "Release", value: "v1.0" }]}
        />
      );
      expect(screen.getByText(/Release:/)).toBeInTheDocument();
      expect(screen.getByText(/v1.0/)).toBeInTheDocument();
    });

    it("renders linked badges as links", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          badges={[{ label: "Release", value: "v1.0", href: "/releases/v1.0" }]}
        />
      );
      const link = screen.getByText(/v1.0/).closest("a");
      expect(link).toHaveAttribute("href", "/releases/v1.0");
    });
  });

  describe("metadata", () => {
    it("renders created date", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          createdAt={new Date("2024-01-15")}
        />
      );
      expect(screen.getByText(/Created/)).toBeInTheDocument();
    });

    it("renders updated time", () => {
      renderWithRouter(
        <DetailPageHeader {...defaultProps} updatedAt={new Date()} />
      );
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });

  describe("primary action", () => {
    it("renders primary action slot", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          primaryAction={<button>Start Work</button>}
        />
      );
      expect(screen.getByText("Start Work")).toBeInTheDocument();
    });
  });

  describe("actions menu", () => {
    it("renders actions menu button when actions provided", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          actions={[{ label: "Delete", onClick: vi.fn() }]}
        />
      );
      expect(screen.getByTitle("More actions")).toBeInTheDocument();
    });

    it("opens actions menu on click", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          actions={[{ label: "Delete", onClick: vi.fn() }]}
        />
      );

      fireEvent.click(screen.getByTitle("More actions"));
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls action onClick when action is clicked", () => {
      const handleDelete = vi.fn();
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          actions={[{ label: "Delete", onClick: handleDelete }]}
        />
      );

      fireEvent.click(screen.getByTitle("More actions"));
      fireEvent.click(screen.getByText("Delete"));

      expect(handleDelete).toHaveBeenCalled();
    });

    it("applies danger variant styling", () => {
      renderWithRouter(
        <DetailPageHeader
          {...defaultProps}
          actions={[
            { label: "Delete", onClick: vi.fn(), variant: "danger" },
          ]}
        />
      );

      fireEvent.click(screen.getByTitle("More actions"));
      const deleteButton = screen.getByText("Delete");
      expect(deleteButton).toHaveClass("text-red-600");
    });
  });

  describe("loading state", () => {
    it("renders skeleton when loading", () => {
      const { container } = renderWithRouter(
        <DetailPageHeader {...defaultProps} isLoading />
      );
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });
});
