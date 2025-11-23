import {
  parseTerminalOutput,
  createParserState,
  estimateProgress,
  type ParserState,
} from '../services/terminal-parser.service';

describe('Terminal Parser Service', () => {
  let state: ParserState;

  beforeEach(() => {
    state = createParserState();
  });

  describe('parseTerminalOutput', () => {
    describe('progress detection', () => {
      it('should detect explicit progress percentage', () => {
        const events = parseTerminalOutput('[Agent] Task 50% complete', state);
        const progressEvent = events.find((e) => e.type === 'progress');
        expect(progressEvent).toBeDefined();
        expect(progressEvent?.type).toBe('progress');
        if (progressEvent?.type === 'progress') {
          expect(progressEvent.progress).toBe(50);
          expect(progressEvent.source).toBe('explicit');
        }
      });

      it('should detect Progress label pattern', () => {
        const events = parseTerminalOutput('Progress: 25%', state);
        const progressEvent = events.find((e) => e.type === 'progress');
        expect(progressEvent).toBeDefined();
        if (progressEvent?.type === 'progress') {
          expect(progressEvent.progress).toBe(25);
        }
      });
    });

    describe('file change detection', () => {
      it('should detect file creation', () => {
        const events = parseTerminalOutput('Created file: src/new-file.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('created');
          expect(fileEvent.filePath).toBe('src/new-file.ts');
        }
      });

      it('should detect file modification', () => {
        const events = parseTerminalOutput('[File] Modified: src/existing.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('modified');
          expect(fileEvent.filePath).toBe('src/existing.ts');
        }
      });

      it('should detect file modification with Updated pattern', () => {
        const events = parseTerminalOutput('Updated src/service.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('modified');
          expect(fileEvent.filePath).toBe('src/service.ts');
        }
      });

      it('should detect file deletion', () => {
        const events = parseTerminalOutput('[File] Deleted: src/old-file.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('deleted');
          expect(fileEvent.filePath).toBe('src/old-file.ts');
        }
      });

      it('should detect file deletion with Removed pattern', () => {
        const events = parseTerminalOutput('Removed src/old.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('deleted');
          expect(fileEvent.filePath).toBe('src/old.ts');
        }
      });

      it('should detect Writing to pattern', () => {
        const events = parseTerminalOutput('Writing to src/component.tsx', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('created');
          expect(fileEvent.filePath).toBe('src/component.tsx');
        }
      });

      it('should detect checkmark created pattern', () => {
        const events = parseTerminalOutput('✓ Created src/new.ts', state);
        const fileEvent = events.find((e) => e.type === 'file');
        expect(fileEvent).toBeDefined();
        if (fileEvent?.type === 'file') {
          expect(fileEvent.action).toBe('created');
          expect(fileEvent.filePath).toBe('src/new.ts');
        }
      });

      it('should track unique files', () => {
        parseTerminalOutput('Created file: src/a.ts', state);
        parseTerminalOutput('Created file: src/b.ts', state);
        parseTerminalOutput('Created file: src/a.ts', state); // duplicate

        expect(state.filesCreated.size).toBe(2);
        expect(state.filesCreated.has('src/a.ts')).toBe(true);
        expect(state.filesCreated.has('src/b.ts')).toBe(true);
      });
    });

    describe('test result detection', () => {
      it('should detect Jest test pass with failure count', () => {
        const events = parseTerminalOutput('Tests: 8 passed, 2 failed', state);
        const testEvent = events.find((e) => e.type === 'test');
        expect(testEvent).toBeDefined();
        if (testEvent?.type === 'test') {
          expect(testEvent.passed).toBe(8);
          expect(testEvent.failed).toBe(2);
        }
      });

      it('should update state with test results', () => {
        parseTerminalOutput('Tests: 5 passed, 0 failed', state);
        expect(state.testsPassed).toBe(5);
      });
    });

    describe('error detection', () => {
      it('should detect error patterns', () => {
        const events = parseTerminalOutput('Error: Something went wrong', state);
        const errorEvent = events.find((e) => e.type === 'error');
        expect(errorEvent).toBeDefined();
        if (errorEvent?.type === 'error') {
          expect(errorEvent.message).toContain('Something went wrong');
          expect(errorEvent.severity).toBe('error');
        }
      });

      it('should update errors array in state', () => {
        parseTerminalOutput('Error: First error', state);
        parseTerminalOutput('Error: Second error', state);
        expect(state.errors.length).toBe(2);
      });
    });

    describe('warning detection', () => {
      it('should detect warning patterns as error events with warning severity', () => {
        const events = parseTerminalOutput('Warning: Deprecated function used', state);
        const errorEvent = events.find((e) => e.type === 'error' && e.severity === 'warning');
        expect(errorEvent).toBeDefined();
        if (errorEvent?.type === 'error') {
          expect(errorEvent.message).toContain('Deprecated function used');
          expect(errorEvent.severity).toBe('warning');
        }
      });

      it('should update warnings array in state', () => {
        parseTerminalOutput('Warning: First warning', state);
        expect(state.warnings.length).toBe(1);
      });
    });
  });

  describe('estimateProgress', () => {
    it('should return 0 for empty state', () => {
      const progress = estimateProgress(state);
      expect(progress).toBe(0);
    });

    it('should estimate progress based on files created', () => {
      state.filesCreated.add('file1.ts');
      state.filesCreated.add('file2.ts');
      state.filesCreated.add('file3.ts');
      const progress = estimateProgress(state);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should estimate higher progress with tests passing', () => {
      const stateWithoutTests = createParserState();
      stateWithoutTests.filesCreated.add('file1.ts');

      const stateWithTests = createParserState();
      stateWithTests.filesCreated.add('file1.ts');
      stateWithTests.testsPassed = 10;
      stateWithTests.testsTotal = 10;

      const progressWithoutTests = estimateProgress(stateWithoutTests);
      const progressWithTests = estimateProgress(stateWithTests);

      expect(progressWithTests).toBeGreaterThan(progressWithoutTests);
    });

    it('should cap progress at 90 when estimated', () => {
      // Max out all metrics
      for (let i = 0; i < 50; i++) {
        state.filesCreated.add(`file${i}.ts`);
      }
      state.testsPassed = 100;
      state.testsTotal = 100;

      const progress = estimateProgress(state);
      expect(progress).toBeLessThanOrEqual(90);
    });
  });

  describe('createParserState', () => {
    it('should create initial state with default values', () => {
      const newState = createParserState();
      expect(newState.filesCreated.size).toBe(0);
      expect(newState.filesModified.size).toBe(0);
      expect(newState.filesDeleted.size).toBe(0);
      expect(newState.testsPassed).toBe(0);
      expect(newState.testsTotal).toBe(0);
      expect(newState.errors.length).toBe(0);
      expect(newState.warnings.length).toBe(0);
      expect(newState.lastProgress).toBe(0);
    });
  });
});
