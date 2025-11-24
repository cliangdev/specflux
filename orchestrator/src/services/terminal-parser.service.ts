/**
 * Terminal Output Parser Service
 *
 * Parses Claude Code terminal output to extract:
 * - Progress percentage
 * - Files created/modified
 * - Test results
 * - Errors and warnings
 */

export interface ProgressEvent {
  type: 'progress';
  progress: number; // 0-100
  source: 'explicit' | 'estimated';
}

export interface FileEvent {
  type: 'file';
  action: 'created' | 'modified' | 'deleted';
  filePath: string;
}

export interface TestEvent {
  type: 'test';
  passed: number;
  failed: number;
  total: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  severity: 'warning' | 'error';
}

export interface StatusEvent {
  type: 'status';
  message: string;
}

export type ParsedEvent = ProgressEvent | FileEvent | TestEvent | ErrorEvent | StatusEvent;

/**
 * Regex patterns for parsing Claude Code output
 */
const PATTERNS = {
  // Claude Code explicit progress: "[Agent] Task 75% complete"
  explicitProgress: /\[(?:Agent|Claude)\].*?(\d{1,3})%\s*(?:complete|done|progress)/i,

  // Alternative progress format: "Progress: 75%"
  progressLabel: /(?:Progress|Completion):\s*(\d{1,3})%/i,

  // File creation patterns
  fileCreated: [
    /Created\s+(?:file)?:?\s*[`'"]*([^\s`'"]+)[`'"]*$/im,
    /\[File\]\s+Created:?\s*([^\s]+)/i,
    /Writing\s+to\s+([^\s]+)/i,
    /✓\s+Created\s+([^\s]+)/i,
    // Claude Code tool patterns
    /Write\(([^)]+)\)/i,
    /Wrote\s+\d+\s+lines?\s+to\s+([^\s]+)/i,
  ],

  // File modification patterns
  fileModified: [
    /Modified\s+(?:file)?:?\s*[`'"]*([^\s`'"]+)[`'"]*$/im,
    /\[File\]\s+Modified:?\s*([^\s]+)/i,
    /Updated\s+([^\s]+)/i,
    /✓\s+Updated\s+([^\s]+)/i,
    // Claude Code tool patterns
    /Edit\(([^)]+)\)/i,
    /Edited\s+([^\s]+)/i,
  ],

  // File deletion patterns
  fileDeleted: [
    /Deleted\s+(?:file)?:?\s*[`'"]*([^\s`'"]+)[`'"]*$/im,
    /\[File\]\s+Deleted:?\s*([^\s]+)/i,
    /Removed\s+([^\s]+\.\w+)/i,
  ],

  // Test result patterns
  testResults: [
    /(\d+)\s*(?:\/|of)\s*(\d+)\s+(?:tests?\s+)?pass(?:ing|ed)?/i,
    /Tests?:\s*(\d+)\s+passed,\s*(\d+)\s+failed/i,
    /✓\s*(\d+)\s+passed.*?(?:✗|✕)\s*(\d+)\s+failed/i,
    /PASS.*?(\d+)\s+passed.*?(\d+)\s+failed/i,
  ],

  // All tests passed
  allTestsPassed: [/All\s+(\d+)\s+tests?\s+passed/i, /✓\s+(\d+)\s+tests?\s+passing/i],

  // Error patterns
  errors: [/(?:Error|ERROR):\s*(.+)/, /(?:Failed|FAILED):\s*(.+)/, /✗\s+(.+)/, /\[ERROR\]\s*(.+)/],

  // Warning patterns
  warnings: [/(?:Warning|WARN):\s*(.+)/i, /⚠️?\s*(.+)/],

  // Status messages
  status: [/\[Agent\]\s*(.+)/i, /\[Claude\]\s*(.+)/i, /\[Status\]\s*(.+)/i, /→\s*(.+)/],
};

/**
 * Parser state to track accumulated metrics
 */
export interface ParserState {
  lastProgress: number;
  filesCreated: Set<string>;
  filesModified: Set<string>;
  filesDeleted: Set<string>;
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
  errors: string[];
  warnings: string[];
}

/**
 * Create initial parser state
 */
export function createParserState(): ParserState {
  return {
    lastProgress: 0,
    filesCreated: new Set(),
    filesModified: new Set(),
    filesDeleted: new Set(),
    testsPassed: 0,
    testsFailed: 0,
    testsTotal: 0,
    errors: [],
    warnings: [],
  };
}

/**
 * Parse a chunk of terminal output and return any detected events
 */
export function parseTerminalOutput(chunk: string, state: ParserState): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Split into lines for pattern matching
  const lines = chunk.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for explicit progress
    let match = trimmedLine.match(PATTERNS.explicitProgress);
    if (match?.[1]) {
      const progress = Math.min(100, Math.max(0, parseInt(match[1], 10)));
      if (progress !== state.lastProgress) {
        state.lastProgress = progress;
        events.push({ type: 'progress', progress, source: 'explicit' });
      }
      continue;
    }

    // Check for progress label
    match = trimmedLine.match(PATTERNS.progressLabel);
    if (match?.[1]) {
      const progress = Math.min(100, Math.max(0, parseInt(match[1], 10)));
      if (progress !== state.lastProgress) {
        state.lastProgress = progress;
        events.push({ type: 'progress', progress, source: 'explicit' });
      }
      continue;
    }

    // Check for file creation
    for (const pattern of PATTERNS.fileCreated) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const filePath = cleanFilePath(match[1]);
        if (filePath && !state.filesCreated.has(filePath)) {
          state.filesCreated.add(filePath);
          events.push({ type: 'file', action: 'created', filePath });
        }
        break;
      }
    }

    // Check for file modification
    for (const pattern of PATTERNS.fileModified) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const filePath = cleanFilePath(match[1]);
        if (filePath && !state.filesModified.has(filePath)) {
          state.filesModified.add(filePath);
          events.push({ type: 'file', action: 'modified', filePath });
        }
        break;
      }
    }

    // Check for file deletion
    for (const pattern of PATTERNS.fileDeleted) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const filePath = cleanFilePath(match[1]);
        if (filePath && !state.filesDeleted.has(filePath)) {
          state.filesDeleted.add(filePath);
          events.push({ type: 'file', action: 'deleted', filePath });
        }
        break;
      }
    }

    // Check for test results
    for (const pattern of PATTERNS.testResults) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const passed = parseInt(match[1], 10);
        const failed = match[2] ? parseInt(match[2], 10) : 0;
        const total = passed + failed;

        if (total > 0 && (passed !== state.testsPassed || failed !== state.testsFailed)) {
          state.testsPassed = passed;
          state.testsFailed = failed;
          state.testsTotal = total;
          events.push({ type: 'test', passed, failed, total });
        }
        break;
      }
    }

    // Check for all tests passed
    for (const pattern of PATTERNS.allTestsPassed) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const passed = parseInt(match[1], 10);
        if (passed > 0 && passed !== state.testsPassed) {
          state.testsPassed = passed;
          state.testsFailed = 0;
          state.testsTotal = passed;
          events.push({ type: 'test', passed, failed: 0, total: passed });
        }
        break;
      }
    }

    // Check for errors
    for (const pattern of PATTERNS.errors) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const message = match[1].trim();
        if (message && !state.errors.includes(message)) {
          state.errors.push(message);
          events.push({ type: 'error', message, severity: 'error' });
        }
        break;
      }
    }

    // Check for warnings
    for (const pattern of PATTERNS.warnings) {
      match = trimmedLine.match(pattern);
      if (match?.[1]) {
        const message = match[1].trim();
        if (message && !state.warnings.includes(message)) {
          state.warnings.push(message);
          events.push({ type: 'error', message, severity: 'warning' });
        }
        break;
      }
    }

    // Check for status messages (only if line starts with pattern)
    for (const pattern of PATTERNS.status) {
      match = trimmedLine.match(pattern);
      if (match?.[1] && trimmedLine.startsWith(match[0].charAt(0))) {
        events.push({ type: 'status', message: match[1].trim() });
        break;
      }
    }
  }

  return events;
}

/**
 * Estimate progress based on accumulated metrics
 * Used when no explicit progress is available
 */
export function estimateProgress(state: ParserState): number {
  // Weight different activities
  const fileWeight = 5; // Each file operation = 5%
  const testWeight = 10; // Passing tests = 10%

  let estimated = 0;

  // Add weight for files (max 50%)
  const fileCount = state.filesCreated.size + state.filesModified.size;
  estimated += Math.min(50, fileCount * fileWeight);

  // Add weight for passing tests (max 40%)
  if (state.testsTotal > 0) {
    const testProgress = (state.testsPassed / state.testsTotal) * testWeight;
    estimated += Math.min(40, testProgress);
  }

  // Cap at 90% - only explicit progress or completion can reach 100%
  return Math.min(90, Math.max(state.lastProgress, estimated));
}

/**
 * Clean and validate file path
 */
function cleanFilePath(path: string): string | null {
  // Remove common prefixes and suffixes
  const cleaned = path
    .replace(/^[`'"]+/, '')
    .replace(/[`'"]+$/, '')
    .replace(/^\.\//g, '')
    .trim();

  // Filter out invalid paths
  if (!cleaned || cleaned.length < 2) return null;
  if (cleaned.includes('...')) return null;
  if (cleaned.startsWith('http')) return null;

  // Must look like a file path (has extension or is in a directory)
  if (!cleaned.includes('/') && !cleaned.includes('.')) return null;

  return cleaned;
}

/**
 * Get summary of parser state
 */
export function getParserSummary(state: ParserState): {
  progress: number;
  filesChanged: number;
  testResults: { passed: number; failed: number; total: number } | null;
  errorCount: number;
  warningCount: number;
} {
  return {
    progress: estimateProgress(state),
    filesChanged: state.filesCreated.size + state.filesModified.size + state.filesDeleted.size,
    testResults:
      state.testsTotal > 0
        ? {
            passed: state.testsPassed,
            failed: state.testsFailed,
            total: state.testsTotal,
          }
        : null,
    errorCount: state.errors.length,
    warningCount: state.warnings.length,
  };
}
