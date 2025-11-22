import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';
import { SPECFLUX_DIRS } from './filesystem.service';

export type FileEventType = 'add' | 'change' | 'unlink';

export interface FileEvent {
  type: FileEventType;
  path: string;
  relativePath: string;
  category: 'prd' | 'epic' | 'task' | 'chain-output' | 'other';
  timestamp: Date;
}

export interface FileWatcherOptions {
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
  /** Whether to emit events for initial files (default: false) */
  ignoreInitial?: boolean;
  /** Use polling instead of native events (for network drives) */
  usePolling?: boolean;
  /** Polling interval in milliseconds (if usePolling is true) */
  pollInterval?: number;
}

const DEFAULT_OPTIONS: Required<FileWatcherOptions> = {
  debounceMs: 100,
  ignoreInitial: true,
  usePolling: false,
  pollInterval: 1000,
};

/**
 * Service for watching .specflux directory for file changes
 */
export class FileWatcherService extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private projectPath: string;
  private options: Required<FileWatcherOptions>;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isWatching = false;

  constructor(projectPath: string, options: FileWatcherOptions = {}) {
    super();
    this.projectPath = projectPath;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start watching the .specflux directory
   */
  start(): void {
    if (this.isWatching) {
      return;
    }

    const watchPath = path.join(this.projectPath, SPECFLUX_DIRS.ROOT);

    this.watcher = chokidar.watch(watchPath, {
      persistent: true,
      ignoreInitial: this.options.ignoreInitial,
      usePolling: this.options.usePolling,
      interval: this.options.pollInterval,
      awaitWriteFinish: {
        stabilityThreshold: this.options.debounceMs,
        pollInterval: 50,
      },
      ignored: [
        /(^|[/\\])\../, // Ignore dotfiles (except .specflux itself)
        '**/node_modules/**',
        '**/.git/**',
      ],
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => {
        this.isWatching = true;
        this.emit('ready');
      });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;

      // Clear any pending debounce timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      this.emit('stopped');
    }
  }

  /**
   * Check if the watcher is currently active
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Handle file event with debouncing
   */
  private handleFileEvent(type: FileEventType, filePath: string): void {
    // Only process markdown files
    if (!filePath.endsWith('.md')) {
      return;
    }

    // Clear existing timer for this path
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.emitFileEvent(type, filePath);
    }, this.options.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Emit a file event
   */
  private emitFileEvent(type: FileEventType, filePath: string): void {
    const relativePath = path.relative(this.projectPath, filePath);
    const category = this.categorizeFile(relativePath);

    const event: FileEvent = {
      type,
      path: filePath,
      relativePath,
      category,
      timestamp: new Date(),
    };

    // Emit general event
    this.emit('file', event);

    // Emit category-specific event
    this.emit(category, event);

    // Emit type-specific event
    this.emit(type, event);
  }

  /**
   * Categorize file based on its location
   */
  private categorizeFile(relativePath: string): FileEvent['category'] {
    if (relativePath.startsWith(SPECFLUX_DIRS.PRDS)) {
      return 'prd';
    }
    if (relativePath.startsWith(SPECFLUX_DIRS.EPICS)) {
      return 'epic';
    }
    if (relativePath.startsWith(SPECFLUX_DIRS.TASKS)) {
      return 'task';
    }
    if (relativePath.startsWith(SPECFLUX_DIRS.CHAIN_OUTPUTS)) {
      return 'chain-output';
    }
    return 'other';
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) {
      return [];
    }

    const watched = this.watcher.getWatched();
    const paths: string[] = [];

    for (const [dir, files] of Object.entries(watched)) {
      for (const file of files) {
        paths.push(path.join(dir, file));
      }
    }

    return paths;
  }
}

/**
 * Create a file watcher for a project
 */
export function createFileWatcher(
  projectPath: string,
  options?: FileWatcherOptions
): FileWatcherService {
  return new FileWatcherService(projectPath, options);
}
