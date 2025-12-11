import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DocumentViewer from "../DocumentViewer";

// Mock MarkdownRenderer
vi.mock("../MarkdownRenderer", () => ({
  default: ({ source }: { source: string }) => (
    <div data-testid="markdown-renderer">{source}</div>
  ),
}));

describe("DocumentViewer", () => {
  describe("Markdown files", () => {
    it("renders markdown files with MarkdownRenderer", () => {
      render(
        <DocumentViewer content="# Hello World" fileName="readme.md" />
      );

      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.getByText("# Hello World")).toBeInTheDocument();
    });

    it("handles .markdown extension", () => {
      render(
        <DocumentViewer content="# Test" fileName="doc.markdown" />
      );

      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
    });

    it("handles uppercase .MD extension", () => {
      render(
        <DocumentViewer content="# Test" fileName="README.MD" />
      );

      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
    });
  });

  describe("HTML files", () => {
    it("renders HTML files in an iframe", () => {
      const htmlContent = "<html><body><h1>Hello</h1></body></html>";
      const { container } = render(
        <DocumentViewer content={htmlContent} fileName="page.html" />
      );

      const iframe = container.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("title", "page.html");
      expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
    });

    it("handles .htm extension", () => {
      const { container } = render(
        <DocumentViewer content="<h1>Test</h1>" fileName="page.htm" />
      );

      expect(container.querySelector("iframe")).toBeInTheDocument();
    });

    it("injects navigation blocker script into HTML", () => {
      const htmlContent = "<html><body><a href='test'>Link</a></body></html>";
      const { container } = render(
        <DocumentViewer content={htmlContent} fileName="page.html" />
      );

      const iframe = container.querySelector("iframe");
      const srcDoc = iframe?.getAttribute("srcdoc") || "";
      expect(srcDoc).toContain("addEventListener");
      expect(srcDoc).toContain("preventDefault");
    });

    it("does not allow same-origin in sandbox", () => {
      const { container } = render(
        <DocumentViewer content="<h1>Test</h1>" fileName="page.html" />
      );

      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).not.toContain("allow-same-origin");
    });
  });

  describe("Plain text fallback", () => {
    it("renders unknown file types as plain text", () => {
      render(
        <DocumentViewer content="plain text content" fileName="file.txt" />
      );

      const pre = screen.getByText("plain text content");
      expect(pre.tagName).toBe("PRE");
    });

    it("renders JSON files as plain text", () => {
      const jsonContent = '{"key": "value"}';
      render(
        <DocumentViewer content={jsonContent} fileName="data.json" />
      );

      expect(screen.getByText(jsonContent)).toBeInTheDocument();
    });

    it("renders files without extension as plain text", () => {
      render(
        <DocumentViewer content="no extension" fileName="Makefile" />
      );

      expect(screen.getByText("no extension")).toBeInTheDocument();
    });

    it("preserves whitespace in plain text", () => {
      const content = "line1\n  indented\n    more indent";
      render(
        <DocumentViewer content={content} fileName="file.txt" />
      );

      const pre = screen.getByText(/line1/);
      expect(pre).toHaveClass("whitespace-pre-wrap");
    });
  });

  describe("className prop", () => {
    it("applies className to markdown container", () => {
      const { container } = render(
        <DocumentViewer
          content="# Test"
          fileName="test.md"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("applies className to HTML container", () => {
      const { container } = render(
        <DocumentViewer
          content="<h1>Test</h1>"
          fileName="test.html"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("applies className to plain text container", () => {
      const { container } = render(
        <DocumentViewer
          content="test"
          fileName="test.txt"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
