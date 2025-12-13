import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListPageHeader } from "./ListPageHeader";

describe("ListPageHeader", () => {
  describe("rendering", () => {
    it("renders title", () => {
      render(<ListPageHeader title="PRDs" />);
      expect(screen.getByText("PRDs")).toBeInTheDocument();
    });

    it("renders create button when onCreate provided", () => {
      render(<ListPageHeader title="PRDs" onCreate={vi.fn()} />);
      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("renders custom create label", () => {
      render(
        <ListPageHeader
          title="PRDs"
          onCreate={vi.fn()}
          createLabel="New PRD"
        />
      );
      expect(screen.getByText("New PRD")).toBeInTheDocument();
    });

    it("renders refresh button when onRefresh provided", () => {
      render(<ListPageHeader title="PRDs" onRefresh={vi.fn()} />);
      expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    });

    it("renders search input when onSearch provided", () => {
      render(<ListPageHeader title="PRDs" onSearch={vi.fn()} />);
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders custom search placeholder", () => {
      render(
        <ListPageHeader
          title="PRDs"
          onSearch={vi.fn()}
          searchPlaceholder="Search PRDs..."
        />
      );
      expect(screen.getByPlaceholderText("Search PRDs...")).toBeInTheDocument();
    });
  });

  describe("filters", () => {
    it("renders filters", () => {
      render(
        <ListPageHeader
          title="PRDs"
          filters={[
            {
              id: "status",
              label: "All Statuses",
              value: "",
              options: [
                { value: "DRAFT", label: "Draft" },
                { value: "APPROVED", label: "Approved" },
              ],
              onChange: vi.fn(),
            },
          ]}
        />
      );
      expect(screen.getByText("All Statuses")).toBeInTheDocument();
    });

    it("calls filter onChange when changed", () => {
      const handleChange = vi.fn();
      render(
        <ListPageHeader
          title="PRDs"
          filters={[
            {
              id: "status",
              label: "All Statuses",
              value: "",
              options: [
                { value: "DRAFT", label: "Draft" },
                { value: "APPROVED", label: "Approved" },
              ],
              onChange: handleChange,
            },
          ]}
        />
      );

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "DRAFT" } });

      expect(handleChange).toHaveBeenCalledWith("DRAFT");
    });
  });

  describe("search", () => {
    it("calls onSearch with debounce", async () => {
      const handleSearch = vi.fn();
      render(
        <ListPageHeader
          title="PRDs"
          onSearch={handleSearch}
          searchValue=""
        />
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "test" } });

      // Should be debounced
      expect(handleSearch).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(handleSearch).toHaveBeenCalledWith("test");
        },
        { timeout: 500 }
      );
    });
  });

  describe("view toggle", () => {
    it("renders view toggle options", () => {
      render(
        <ListPageHeader
          title="PRDs"
          viewOptions={[
            { id: "grid", icon: "grid", label: "Grid view" },
            { id: "list", icon: "list", label: "List view" },
          ]}
          activeView="grid"
          onViewChange={vi.fn()}
        />
      );

      expect(screen.getByTitle("Grid view")).toBeInTheDocument();
      expect(screen.getByTitle("List view")).toBeInTheDocument();
    });

    it("calls onViewChange when view is changed", () => {
      const handleViewChange = vi.fn();
      render(
        <ListPageHeader
          title="PRDs"
          viewOptions={[
            { id: "grid", icon: "grid", label: "Grid view" },
            { id: "list", icon: "list", label: "List view" },
          ]}
          activeView="grid"
          onViewChange={handleViewChange}
        />
      );

      fireEvent.click(screen.getByTitle("List view"));
      expect(handleViewChange).toHaveBeenCalledWith("list");
    });

    it("highlights active view", () => {
      const { container } = render(
        <ListPageHeader
          title="PRDs"
          viewOptions={[
            { id: "grid", icon: "grid", label: "Grid view" },
            { id: "list", icon: "list", label: "List view" },
          ]}
          activeView="grid"
          onViewChange={vi.fn()}
        />
      );

      const gridButton = screen.getByTitle("Grid view");
      expect(gridButton).toHaveClass("bg-surface-100");
    });
  });

  describe("filter summary", () => {
    it("shows filter summary when filters are active", () => {
      render(
        <ListPageHeader
          title="PRDs"
          totalCount={24}
          filteredCount={8}
        />
      );

      expect(screen.getByText("Showing 8 of 24 items")).toBeInTheDocument();
    });

    it("does not show filter summary when counts are equal", () => {
      render(
        <ListPageHeader
          title="PRDs"
          totalCount={24}
          filteredCount={24}
        />
      );

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it("shows clear filters button when onClearFilters provided", () => {
      render(
        <ListPageHeader
          title="PRDs"
          totalCount={24}
          filteredCount={8}
          onClearFilters={vi.fn()}
        />
      );

      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });

    it("calls onClearFilters when clicked", () => {
      const handleClear = vi.fn();
      render(
        <ListPageHeader
          title="PRDs"
          totalCount={24}
          filteredCount={8}
          onClearFilters={handleClear}
        />
      );

      fireEvent.click(screen.getByText("Clear filters"));
      expect(handleClear).toHaveBeenCalled();
    });
  });

  describe("actions", () => {
    it("calls onCreate when create button clicked", () => {
      const handleCreate = vi.fn();
      render(<ListPageHeader title="PRDs" onCreate={handleCreate} />);

      fireEvent.click(screen.getByText("Create"));
      expect(handleCreate).toHaveBeenCalled();
    });

    it("calls onRefresh when refresh button clicked", () => {
      const handleRefresh = vi.fn();
      render(<ListPageHeader title="PRDs" onRefresh={handleRefresh} />);

      fireEvent.click(screen.getByTitle("Refresh"));
      expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows spinning icon when refreshing", () => {
      const { container } = render(
        <ListPageHeader title="PRDs" onRefresh={vi.fn()} isRefreshing />
      );

      const svg = container.querySelector(".animate-spin");
      expect(svg).toBeInTheDocument();
    });

    it("renders extra actions", () => {
      render(
        <ListPageHeader
          title="PRDs"
          extraActions={<button>Import</button>}
        />
      );

      expect(screen.getByText("Import")).toBeInTheDocument();
    });
  });
});
