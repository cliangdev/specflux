import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FileTree } from "../FileTree";
import type { ListFiles200ResponseDataInner } from "../../../api/generated/models/ListFiles200ResponseDataInner";

const mockFiles: ListFiles200ResponseDataInner[] = [
  {
    name: "README.md",
    path: "README.md",
    type: "file",
    size: 1024,
    modifiedAt: new Date("2024-01-15"),
  },
  {
    name: "src",
    path: "src",
    type: "directory",
    size: 0,
    modifiedAt: new Date("2024-01-15"),
  },
  {
    name: "config.json",
    path: "config.json",
    type: "file",
    size: 256,
    modifiedAt: new Date("2024-01-15"),
  },
];

const mockNestedFiles: ListFiles200ResponseDataInner[] = [
  {
    name: "index.ts",
    path: "src/index.ts",
    type: "file",
    size: 512,
    modifiedAt: new Date("2024-01-15"),
  },
  {
    name: "components",
    path: "src/components",
    type: "directory",
    size: 0,
    modifiedAt: new Date("2024-01-15"),
  },
];

describe("FileTree", () => {
  const defaultProps = {
    files: mockFiles,
    selectedPath: null,
    onFileSelect: vi.fn(),
    expandedDirs: new Set<string>(),
    dirContents: new Map<string, ListFiles200ResponseDataInner[]>(),
    onDirectoryToggle: vi.fn(),
  };

  it("renders list of files and directories", () => {
    render(<FileTree {...defaultProps} />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("config.json")).toBeInTheDocument();
  });

  it("displays file sizes for files", () => {
    render(<FileTree {...defaultProps} />);

    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.getByText("256 B")).toBeInTheDocument();
  });

  it("calls onFileSelect when clicking a file", () => {
    const onFileSelect = vi.fn();
    render(<FileTree {...defaultProps} onFileSelect={onFileSelect} />);

    fireEvent.click(screen.getByText("README.md"));

    expect(onFileSelect).toHaveBeenCalledWith("README.md");
  });

  it("calls onDirectoryToggle when clicking a directory", () => {
    const onDirectoryToggle = vi.fn();
    render(
      <FileTree {...defaultProps} onDirectoryToggle={onDirectoryToggle} />,
    );

    fireEvent.click(screen.getByText("src"));

    expect(onDirectoryToggle).toHaveBeenCalledWith("src");
  });

  it("highlights selected file", () => {
    render(<FileTree {...defaultProps} selectedPath="README.md" />);

    const fileItem = screen.getByText("README.md").closest("div");
    expect(fileItem).toHaveClass("bg-brand-50");
  });

  it("shows nested files when directory is expanded", () => {
    const expandedDirs = new Set(["src"]);
    const dirContents = new Map([["src", mockNestedFiles]]);

    render(
      <FileTree
        {...defaultProps}
        expandedDirs={expandedDirs}
        dirContents={dirContents}
      />,
    );

    expect(screen.getByText("index.ts")).toBeInTheDocument();
    expect(screen.getByText("components")).toBeInTheDocument();
  });

  it("renders empty state when no files", () => {
    render(<FileTree {...defaultProps} files={[]} />);

    expect(screen.getByText("No files found")).toBeInTheDocument();
  });

  it("shows chevron icon for directories", () => {
    render(<FileTree {...defaultProps} />);

    // The src directory should have a chevron (svg element)
    const srcRow = screen.getByText("src").closest("div");
    const svgs = srcRow?.querySelectorAll("svg");
    // Should have 2 SVGs: chevron + folder icon
    expect(svgs?.length).toBe(2);
  });

  it("rotates chevron when directory is expanded", () => {
    const expandedDirs = new Set(["src"]);
    const dirContents = new Map([["src", mockNestedFiles]]);

    render(
      <FileTree
        {...defaultProps}
        expandedDirs={expandedDirs}
        dirContents={dirContents}
      />,
    );

    const srcRow = screen.getByText("src").closest("div");
    const chevron = srcRow?.querySelector("svg");
    expect(chevron).toHaveClass("rotate-90");
  });

  it("handles deeply nested directories", () => {
    const deepNestedFiles: ListFiles200ResponseDataInner[] = [
      {
        name: "Button.tsx",
        path: "src/components/Button.tsx",
        type: "file",
        size: 2048,
        modifiedAt: new Date("2024-01-15"),
      },
    ];

    const expandedDirs = new Set(["src", "src/components"]);
    const dirContents = new Map([
      ["src", mockNestedFiles],
      ["src/components", deepNestedFiles],
    ]);

    render(
      <FileTree
        {...defaultProps}
        expandedDirs={expandedDirs}
        dirContents={dirContents}
      />,
    );

    expect(screen.getByText("Button.tsx")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });
});
