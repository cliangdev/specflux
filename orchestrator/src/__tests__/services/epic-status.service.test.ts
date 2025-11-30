import { getDatabase } from '../../db';
import { createTask, updateTask, deleteTask, submitTaskReview } from '../../services/task.service';
import { createEpic, getEpicById } from '../../services/epic.service';

describe('Epic Auto-Status Updates', () => {
  let projectId: number;
  let epicId: number;
  const userId = 1;

  beforeAll(() => {
    const db = getDatabase();
    // Ensure default user exists
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'default@specflux.dev', 'Default User')
    `);

    // Create a test project
    const uniqueName = `Epic Status Test Project ${Date.now()}`;
    const result = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`epic-status-test-${Date.now()}`, uniqueName, '/test/epic-status', 1);
    projectId = result.lastInsertRowid as number;

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);
  });

  beforeEach(() => {
    // Create a fresh epic for each test
    const epic = createEpic(
      projectId,
      {
        title: `Test Epic ${Date.now()}`,
        description: 'Test epic for auto-status updates',
      },
      userId
    );
    epicId = epic.id;
  });

  describe('createTask', () => {
    it('should keep epic in planning status when task is created (default backlog)', () => {
      createTask(
        projectId,
        {
          title: 'Backlog Task',
          epic_id: epicId,
        },
        userId
      );

      const epic = getEpicById(epicId);
      expect(epic?.status).toBe('planning');
    });
  });

  describe('updateTask', () => {
    it('should update epic to active when task status changes to in_progress', () => {
      const task = createTask(
        projectId,
        {
          title: 'Task to Start',
          epic_id: epicId,
        },
        userId
      );

      // Epic should still be planning
      let epic = getEpicById(epicId);
      expect(epic?.status).toBe('planning');

      // Start the task
      updateTask(task.id, { status: 'in_progress' });

      // Epic should now be active
      epic = getEpicById(epicId);
      expect(epic?.status).toBe('active');
    });

    it('should update epic to completed when all tasks are done', () => {
      const task1 = createTask(
        projectId,
        {
          title: 'Task 1',
          epic_id: epicId,
        },
        userId
      );

      const task2 = createTask(
        projectId,
        {
          title: 'Task 2',
          epic_id: epicId,
        },
        userId
      );

      // Complete both tasks
      updateTask(task1.id, { status: 'done' });
      updateTask(task2.id, { status: 'done' });

      const epic = getEpicById(epicId);
      expect(epic?.status).toBe('completed');
    });

    it('should update epic back to active when a completed task is reopened', () => {
      const task = createTask(
        projectId,
        {
          title: 'Task to Reopen',
          epic_id: epicId,
        },
        userId
      );

      // Complete the task first
      updateTask(task.id, { status: 'done' });

      // Epic should be completed
      let epic = getEpicById(epicId);
      expect(epic?.status).toBe('completed');

      // Reopen the task
      updateTask(task.id, { status: 'in_progress' });

      // Epic should be active again
      epic = getEpicById(epicId);
      expect(epic?.status).toBe('active');
    });

    it('should update both old and new epic when task is moved', () => {
      // Create second epic
      const epic2 = createEpic(
        projectId,
        {
          title: 'Second Epic',
          description: 'Another epic',
        },
        userId
      );

      // Create task in first epic
      const task = createTask(
        projectId,
        {
          title: 'Movable Task',
          epic_id: epicId,
        },
        userId
      );

      // Start the task to make first epic active
      updateTask(task.id, { status: 'in_progress' });

      // First epic should be active, second should be planning
      let firstEpic = getEpicById(epicId);
      let secondEpic = getEpicById(epic2.id);
      expect(firstEpic?.status).toBe('active');
      expect(secondEpic?.status).toBe('planning');

      // Move task to second epic
      updateTask(task.id, { epic_id: epic2.id });

      // First epic should go back to planning, second should be active
      firstEpic = getEpicById(epicId);
      secondEpic = getEpicById(epic2.id);
      expect(firstEpic?.status).toBe('planning');
      expect(secondEpic?.status).toBe('active');
    });
  });

  describe('deleteTask', () => {
    it('should update epic status when task is deleted', () => {
      // Create a task
      const task = createTask(
        projectId,
        {
          title: 'Task to Delete',
          epic_id: epicId,
        },
        userId
      );

      // Start the task to make epic active
      updateTask(task.id, { status: 'in_progress' });

      let epic = getEpicById(epicId);
      expect(epic?.status).toBe('active');

      // Delete the task
      deleteTask(task.id);

      // Epic should go back to planning (no tasks)
      epic = getEpicById(epicId);
      expect(epic?.status).toBe('planning');
    });

    it('should update epic to completed when last incomplete task is deleted', () => {
      // Create two tasks
      const task1 = createTask(
        projectId,
        {
          title: 'Completed Task',
          epic_id: epicId,
        },
        userId
      );

      const task2 = createTask(
        projectId,
        {
          title: 'Incomplete Task',
          epic_id: epicId,
        },
        userId
      );

      // Complete first task, start second task
      updateTask(task1.id, { status: 'done' });
      updateTask(task2.id, { status: 'in_progress' });

      // Epic should be active (has in_progress task)
      let epic = getEpicById(epicId);
      expect(epic?.status).toBe('active');

      // Delete the incomplete task
      deleteTask(task2.id);

      // Epic should now be completed (only done task remains)
      epic = getEpicById(epicId);
      expect(epic?.status).toBe('completed');
    });
  });

  describe('submitTaskReview', () => {
    it('should update epic to completed when last task is approved', () => {
      // Create task that requires approval
      const task = createTask(
        projectId,
        {
          title: 'Task Needing Approval',
          epic_id: epicId,
          requires_approval: true,
        },
        userId
      );

      // Move to pending_review
      updateTask(task.id, { status: 'pending_review' });

      let epic = getEpicById(epicId);
      expect(epic?.status).toBe('active');

      // Approve the task
      submitTaskReview(task.id, userId, 'approve', 'Looks good');

      // Epic should be completed
      epic = getEpicById(epicId);
      expect(epic?.status).toBe('completed');
    });
  });
});
