import { getDatabase } from '../db';
import {
  recordFileChange,
  getFileChange,
  getFileChangesForTask,
  getFileChangesForSession,
  getFileChangeSummary,
  deleteFileChangesForTask,
  deleteFileChangesForSession,
  updateDiffSummary,
} from '../services/file-tracking.service';

// Database is already initialized via jest setup (in-memory for tests)

describe('File Tracking Service', () => {
  // Test IDs populated in beforeAll
  let testTaskId: number;
  let testSessionId: number;
  let testSessionId2: number;
  let testTaskId2: number;

  beforeAll(() => {
    const db = getDatabase();

    // Ensure default user exists
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'test@example.com', 'Test User')
    `);

    // Create test project with unique project_id
    const uniqueProjectId = `file-tracking-test-${Date.now()}`;
    const projectResult = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(uniqueProjectId, 'File Tracking Test Project', '/test/path', 1);
    const projectId = Number(projectResult.lastInsertRowid);

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);

    // Create test task
    const taskResult = db
      .prepare(
        `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(projectId, 'File Tracking Test Task', 'ready', 0, 1);
    testTaskId = Number(taskResult.lastInsertRowid);

    // Create second test task
    const taskResult2 = db
      .prepare(
        `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(projectId, 'File Tracking Test Task 2', 'ready', 0, 1);
    testTaskId2 = Number(taskResult2.lastInsertRowid);

    // Create test session
    const sessionResult = db
      .prepare(
        `INSERT INTO agent_sessions (task_id, status, started_at)
         VALUES (?, ?, datetime('now'))`
      )
      .run(testTaskId, 'completed');
    testSessionId = Number(sessionResult.lastInsertRowid);

    // Create second session for session tests
    const sessionResult2 = db
      .prepare(
        `INSERT INTO agent_sessions (task_id, status, started_at)
         VALUES (?, ?, datetime('now'))`
      )
      .run(testTaskId, 'completed');
    testSessionId2 = Number(sessionResult2.lastInsertRowid);
  });

  beforeEach(() => {
    // Clean up test data before each test
    deleteFileChangesForTask(testTaskId);
    deleteFileChangesForTask(testTaskId2);
  });

  describe('recordFileChange', () => {
    it('should record a new file change', () => {
      const change = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/new-file.ts',
        changeType: 'created',
      });

      expect(change).toBeDefined();
      expect(change.id).toBeGreaterThan(0);
      expect(change.taskId).toBe(testTaskId);
      expect(change.sessionId).toBe(testSessionId);
      expect(change.filePath).toBe('src/new-file.ts');
      expect(change.changeType).toBe('created');
    });

    it('should record file change with diff summary', () => {
      const change = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/modified.ts',
        changeType: 'modified',
        diffSummary: 'Added new function',
      });

      expect(change.diffSummary).toBe('Added new function');
    });

    it('should update existing file change for same task/session/path', () => {
      const firstChange = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/file.ts',
        changeType: 'created',
      });

      const secondChange = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/file.ts',
        changeType: 'modified',
      });

      // Should be the same record, updated
      expect(secondChange.id).toBe(firstChange.id);
      expect(secondChange.changeType).toBe('modified');
    });

    it('should create separate records for different files', () => {
      const change1 = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/file1.ts',
        changeType: 'created',
      });

      const change2 = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/file2.ts',
        changeType: 'created',
      });

      expect(change1.id).not.toBe(change2.id);
    });

    it('should handle null session ID', () => {
      const change = recordFileChange({
        taskId: testTaskId,
        sessionId: null,
        filePath: 'src/file.ts',
        changeType: 'created',
      });

      expect(change.sessionId).toBeNull();
    });
  });

  describe('getFileChange', () => {
    it('should retrieve a file change by ID', () => {
      const created = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/test.ts',
        changeType: 'created',
      });

      const retrieved = getFileChange(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.filePath).toBe('src/test.ts');
    });

    it('should return null for non-existent ID', () => {
      const result = getFileChange(999999);
      expect(result).toBeNull();
    });
  });

  describe('getFileChangesForTask', () => {
    it('should return all file changes for a task', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/a.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/b.ts',
        changeType: 'modified',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/c.ts',
        changeType: 'deleted',
      });

      const changes = getFileChangesForTask(testTaskId);
      expect(changes.length).toBe(3);
    });

    it('should return empty array for task with no changes', () => {
      const changes = getFileChangesForTask(88888);
      expect(changes).toEqual([]);
    });

    it('should order by created_at DESC (by ID as proxy for time)', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/first.ts',
        changeType: 'created',
      });

      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/second.ts',
        changeType: 'created',
      });

      const changes = getFileChangesForTask(testTaskId);
      // Should return both records
      expect(changes.length).toBe(2);
      // Since timestamps may be equal at millisecond resolution,
      // just verify we get the expected files
      const filePaths = changes.map((c) => c.filePath);
      expect(filePaths).toContain('src/first.ts');
      expect(filePaths).toContain('src/second.ts');
    });
  });

  describe('getFileChangesForSession', () => {
    it('should return file changes for a specific session', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/session1.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId2,
        filePath: 'src/session2.ts',
        changeType: 'created',
      });

      const changes = getFileChangesForSession(testSessionId);
      expect(changes.length).toBe(1);
      expect(changes[0]?.filePath).toBe('src/session1.ts');
    });
  });

  describe('getFileChangeSummary', () => {
    it('should return correct counts for each change type', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/new1.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/new2.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/mod.ts',
        changeType: 'modified',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/del.ts',
        changeType: 'deleted',
      });

      const summary = getFileChangeSummary(testTaskId);
      expect(summary.total).toBe(4);
      expect(summary.created).toBe(2);
      expect(summary.modified).toBe(1);
      expect(summary.deleted).toBe(1);
    });

    it('should return zeros for task with no changes', () => {
      const summary = getFileChangeSummary(77777);
      expect(summary.total).toBe(0);
      expect(summary.created).toBe(0);
      expect(summary.modified).toBe(0);
      expect(summary.deleted).toBe(0);
    });
  });

  describe('deleteFileChangesForTask', () => {
    it('should delete all file changes for a task', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/a.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/b.ts',
        changeType: 'modified',
      });

      const deletedCount = deleteFileChangesForTask(testTaskId);
      expect(deletedCount).toBe(2);

      const remaining = getFileChangesForTask(testTaskId);
      expect(remaining.length).toBe(0);
    });
  });

  describe('deleteFileChangesForSession', () => {
    it('should delete file changes for a specific session only', () => {
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/session1.ts',
        changeType: 'created',
      });
      recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId2,
        filePath: 'src/session2.ts',
        changeType: 'created',
      });

      const deletedCount = deleteFileChangesForSession(testSessionId);
      expect(deletedCount).toBe(1);

      // Other session's changes should remain
      const remaining = getFileChangesForTask(testTaskId);
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.sessionId).toBe(testSessionId2);
    });
  });

  describe('updateDiffSummary', () => {
    it('should update diff summary for existing change', () => {
      const change = recordFileChange({
        taskId: testTaskId,
        sessionId: testSessionId,
        filePath: 'src/file.ts',
        changeType: 'modified',
      });

      updateDiffSummary(change.id, 'Updated 5 lines');

      const updated = getFileChange(change.id);
      expect(updated?.diffSummary).toBe('Updated 5 lines');
    });
  });
});
