import { useEffect, useRef, useState, useMemo } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import mermaid from "mermaid";
import { useTheme } from "../../contexts";

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

// Mermaid diagram component
function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      try {
        // Update mermaid theme based on app theme
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
        });

        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderDiagram();
  }, [code, id, theme]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
          Failed to render diagram
        </p>
        <pre className="text-xs text-red-500 dark:text-red-300 overflow-auto">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="text-xs text-red-400 cursor-pointer">
            Show source
          </summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Counter for unique mermaid diagram IDs
let mermaidIdCounter = 0;

// Extract mermaid code blocks and replace with placeholders
function extractMermaidBlocks(source: string): {
  processedSource: string;
  mermaidBlocks: Map<string, string>;
} {
  const mermaidBlocks = new Map<string, string>();
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

  const processedSource = source.replace(mermaidRegex, (_, code) => {
    const id = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
    mermaidBlocks.set(id, code.trim());
    return `\n<div data-mermaid-id="${id}"></div>\n`;
  });

  return { processedSource, mermaidBlocks };
}

export default function MarkdownRenderer({
  source,
  className,
}: MarkdownRendererProps) {
  const { theme } = useTheme();

  // Extract mermaid blocks from source
  const { processedSource, mermaidBlocks } = useMemo(
    () => extractMermaidBlocks(source),
    [source]
  );

  return (
    <div className={className} data-color-mode={theme}>
      <MarkdownPreview
        source={processedSource}
        style={{
          backgroundColor: "transparent",
          padding: 0,
        }}
        rehypeRewrite={(node) => {
          // Find div elements with data-mermaid-id attribute
          if (
            node.type === "element" &&
            node.tagName === "div" &&
            node.properties?.["dataMermaidId"]
          ) {
            const id = node.properties["dataMermaidId"] as string;
            const code = mermaidBlocks.get(id);
            if (code) {
              // Mark this node to be replaced with mermaid component
              node.properties["data-mermaid-code"] = code;
            }
          }
        }}
        components={{
          div: ({ node: _node, ...props }) => {
            const restProps = props as Record<string, unknown>;
            const mermaidId = restProps["data-mermaid-id"] as string | undefined;
            const mermaidCode = restProps["data-mermaid-code"] as
              | string
              | undefined;

            if (mermaidId && mermaidCode) {
              return <MermaidDiagram code={mermaidCode} id={mermaidId} />;
            }
            return <div {...props} />;
          },
        }}
      />
    </div>
  );
}
