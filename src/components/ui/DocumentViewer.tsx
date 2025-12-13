import { useMemo } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface DocumentViewerProps {
  content: string;
  fileName: string;
  className?: string;
}

/**
 * Wraps HTML content with a script that prevents navigation.
 * This stops links from navigating the parent app.
 */
function wrapHtmlContent(content: string): string {
  const navigationBlocker = `
<script>
  // Block all navigation attempts
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Block form submissions
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, true);
</script>
`;

  // Insert the script at the end of the body or document
  if (content.includes("</body>")) {
    return content.replace("</body>", `${navigationBlocker}</body>`);
  } else if (content.includes("</html>")) {
    return content.replace("</html>", `${navigationBlocker}</html>`);
  } else {
    return content + navigationBlocker;
  }
}

/**
 * Renders document content based on file extension.
 * Supports: Markdown (.md), HTML (.html/.htm), and falls back to plain text.
 */
export default function DocumentViewer({
  content,
  fileName,
  className,
}: DocumentViewerProps) {
  const extension = fileName.toLowerCase().split(".").pop() || "";

  // Memoize wrapped HTML content to avoid re-processing on every render
  const wrappedHtmlContent = useMemo(() => {
    if (extension === "html" || extension === "htm") {
      return wrapHtmlContent(content);
    }
    return content;
  }, [content, extension]);

  // Markdown files
  if (extension === "md" || extension === "markdown") {
    return (
      <div className={className}>
        <MarkdownRenderer source={content} />
      </div>
    );
  }

  // HTML files - render in sandboxed iframe
  if (extension === "html" || extension === "htm") {
    return (
      <div className={`${className} h-full`}>
        <iframe
          key={fileName}
          srcDoc={wrappedHtmlContent}
          className="w-full h-full border-0 bg-white rounded-lg"
          sandbox="allow-scripts"
          title={fileName}
        />
      </div>
    );
  }

  // Plain text fallback for all other file types
  return (
    <div className={className}>
      <pre className="whitespace-pre-wrap font-mono text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-900 p-4 rounded-lg overflow-auto">
        {content}
      </pre>
    </div>
  );
}
