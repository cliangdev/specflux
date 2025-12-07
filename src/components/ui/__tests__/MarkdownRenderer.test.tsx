import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownRenderer from "../MarkdownRenderer";

// Mock ThemeContext
vi.mock("../../../contexts", () => ({
  useTheme: () => ({ theme: "light" }),
}));

// Mock mermaid
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from "mermaid";

const mockMermaid = mermaid as {
  initialize: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
};

describe("MarkdownRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMermaid.render.mockResolvedValue({ svg: "<svg>mocked diagram</svg>" });
  });

  it("renders basic markdown text", async () => {
    render(<MarkdownRenderer source="Hello World" />);

    await waitFor(() => {
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });
  });

  it("renders markdown headings", async () => {
    render(<MarkdownRenderer source={`# Heading 1

## Heading 2`} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Heading 1",
      );
    });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Heading 2",
    );
  });

  it("renders markdown paragraphs", async () => {
    render(
      <MarkdownRenderer source={`First paragraph.

Second paragraph.`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    });
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders markdown lists", async () => {
    render(<MarkdownRenderer source={`- Item 1
- Item 2
- Item 3`} />);

    await waitFor(() => {
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders markdown code blocks", async () => {
    const { container } = render(<MarkdownRenderer source={`\`\`\`javascript
const x = 1;
\`\`\``} />);

    await waitFor(() => {
      // Code is split into syntax-highlighted spans, check for the pre element
      const preElement = container.querySelector("pre.language-javascript");
      expect(preElement).toBeInTheDocument();
      // Check that the code content is present (split across spans)
      expect(preElement?.textContent).toContain("const");
      expect(preElement?.textContent).toContain("x");
      expect(preElement?.textContent).toContain("1");
    });
  });

  it("renders inline code", async () => {
    render(<MarkdownRenderer source="Use `const` for constants." />);

    await waitFor(() => {
      expect(screen.getByText("const")).toBeInTheDocument();
    });
  });

  it("renders markdown links", async () => {
    render(<MarkdownRenderer source="[Click here](https://example.com)" />);

    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Click here" });
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });

  it("applies custom className", async () => {
    const { container } = render(
      <MarkdownRenderer source="Test" className="custom-class" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  it("sets data-color-mode attribute for theming", async () => {
    const { container } = render(<MarkdownRenderer source="Test" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveAttribute("data-color-mode", "light");
    });
  });

  it("renders empty source without error", async () => {
    const { container } = render(<MarkdownRenderer source="" />);

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Mermaid diagrams", () => {
    it("renders mermaid diagrams", async () => {
      const mermaidSource = `# Test

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Some text after.`;

      render(<MarkdownRenderer source={mermaidSource} />);

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });
      });

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });
    });

    it("extracts mermaid code correctly", async () => {
      const mermaidSource = `\`\`\`mermaid
flowchart LR
    Start --> End
\`\`\``;

      render(<MarkdownRenderer source={mermaidSource} />);

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledWith(
          expect.stringMatching(/^mermaid-/),
          "flowchart LR\n    Start --> End",
        );
      });
    });

    it("handles mermaid rendering errors gracefully", async () => {
      mockMermaid.render.mockRejectedValue(new Error("Invalid syntax"));

      const mermaidSource = `\`\`\`mermaid
invalid diagram
\`\`\``;

      render(<MarkdownRenderer source={mermaidSource} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to render diagram")).toBeInTheDocument();
      });
      expect(screen.getByText("Invalid syntax")).toBeInTheDocument();
    });

    it("shows source code in error details", async () => {
      mockMermaid.render.mockRejectedValue(new Error("Parse error"));

      const mermaidSource = `\`\`\`mermaid
bad syntax here
\`\`\``;

      render(<MarkdownRenderer source={mermaidSource} />);

      await waitFor(() => {
        expect(screen.getByText("Show source")).toBeInTheDocument();
      });
    });

    it("handles multiple mermaid diagrams", async () => {
      const mermaidSource = `\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Some text between.

\`\`\`mermaid
graph LR
    C --> D
\`\`\``;

      render(<MarkdownRenderer source={mermaidSource} />);

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledTimes(2);
      });
    });
  });
});
