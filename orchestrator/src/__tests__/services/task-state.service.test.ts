import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  createTaskState,
  readTaskState,
  injectChainInputs,
  setChainOutput,
  hasTaskState,
  deleteTaskState,
  getTaskStatePath,
} from '../../services/task-state.service';

describe('Task State Service', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specflux-task-state-test-'));
    // Create .specflux/tasks directory
    fs.mkdirSync(path.join(tempDir, '.specflux', 'tasks'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createTaskState', () => {
    it('should create a new task state file', () => {
      createTaskState(tempDir, 1, 'Test Task', null);

      expect(hasTaskState(tempDir, 1)).toBe(true);
      const state = readTaskState(tempDir, 1);
      expect(state).not.toBeNull();
      expect(state?.metadata.task_id).toBe(1);
    });

    it('should create task state with epic_id', () => {
      createTaskState(tempDir, 2, 'Epic Task', 10);

      const state = readTaskState(tempDir, 2);
      expect(state?.metadata.epic_id).toBe(10);
    });
  });

  describe('injectChainInputs', () => {
    it('should inject chain inputs from completed dependency tasks', () => {
      // Create task 1 (dependency) with chain output
      createTaskState(tempDir, 1, 'Dependency Task', null);
      setChainOutput(tempDir, 1, {
        summary: 'This is the summary from task 1',
        api_contract: 'GET /api/v1/resource',
        integration_notes: 'Use the API endpoint to fetch resources',
      });

      // Create task 2 (dependent task)
      createTaskState(tempDir, 2, 'Dependent Task', null);

      // Inject chain inputs
      const result = injectChainInputs(tempDir, 2, [{ id: 1, title: 'Dependency Task' }]);

      expect(result.chain_inputs).toHaveLength(1);
      const firstInput = result.chain_inputs[0]!;
      expect(firstInput.task_id).toBe(1);
      expect(firstInput.title).toBe('Dependency Task');
      expect(firstInput.content).toContain('This is the summary from task 1');
      expect(firstInput.content).toContain('GET /api/v1/resource');
      expect(firstInput.content).toContain('Use the API endpoint');
    });

    it('should inject chain inputs from multiple dependencies', () => {
      // Create task 1 with chain output
      createTaskState(tempDir, 1, 'Task 1', null);
      setChainOutput(tempDir, 1, {
        summary: 'Summary from task 1',
      });

      // Create task 2 with chain output
      createTaskState(tempDir, 2, 'Task 2', null);
      setChainOutput(tempDir, 2, {
        summary: 'Summary from task 2',
        api_contract: 'POST /api/v1/create',
      });

      // Create task 3 (depends on 1 and 2)
      createTaskState(tempDir, 3, 'Dependent Task', null);

      const result = injectChainInputs(tempDir, 3, [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' },
      ]);

      expect(result.chain_inputs).toHaveLength(2);
      expect(result.chain_inputs[0]!.task_id).toBe(1);
      expect(result.chain_inputs[1]!.task_id).toBe(2);
    });

    it('should skip dependencies without chain output', () => {
      // Create task 1 without chain output
      createTaskState(tempDir, 1, 'Task without output', null);

      // Create task 2 with chain output
      createTaskState(tempDir, 2, 'Task with output', null);
      setChainOutput(tempDir, 2, {
        summary: 'Has output',
      });

      // Create task 3
      createTaskState(tempDir, 3, 'Dependent', null);

      const result = injectChainInputs(tempDir, 3, [
        { id: 1, title: 'Task without output' },
        { id: 2, title: 'Task with output' },
      ]);

      // Only task 2 should be included
      expect(result.chain_inputs).toHaveLength(1);
      expect(result.chain_inputs[0]!.task_id).toBe(2);
    });

    it('should persist chain inputs to disk', () => {
      createTaskState(tempDir, 1, 'Dep', null);
      setChainOutput(tempDir, 1, { summary: 'Output' });
      createTaskState(tempDir, 2, 'Main', null);

      injectChainInputs(tempDir, 2, [{ id: 1, title: 'Dep' }]);

      // Read fresh from disk
      const state = readTaskState(tempDir, 2);
      expect(state?.chain_inputs).toHaveLength(1);
      expect(state?.chain_inputs[0]!.content).toBe('Output');
    });

    it('should throw error if task state does not exist', () => {
      expect(() => {
        injectChainInputs(tempDir, 999, [{ id: 1, title: 'Dep' }]);
      }).toThrow('Task state not found for task 999');
    });
  });

  describe('setChainOutput', () => {
    it('should set chain output and completed_at timestamp', () => {
      createTaskState(tempDir, 1, 'Task', null);

      const before = new Date().toISOString();
      setChainOutput(tempDir, 1, {
        summary: 'Completed work summary',
        api_contract: 'API contract details',
      });
      const after = new Date().toISOString();

      const state = readTaskState(tempDir, 1);
      expect(state?.chain_output?.summary).toBe('Completed work summary');
      expect(state?.chain_output?.api_contract).toBe('API contract details');
      expect(state?.metadata.completed_at).toBeDefined();
      expect(state?.metadata.completed_at! >= before).toBe(true);
      expect(state?.metadata.completed_at! <= after).toBe(true);
    });
  });

  describe('deleteTaskState', () => {
    it('should delete task state file', () => {
      createTaskState(tempDir, 1, 'Task', null);
      expect(hasTaskState(tempDir, 1)).toBe(true);

      deleteTaskState(tempDir, 1);
      expect(hasTaskState(tempDir, 1)).toBe(false);
    });

    it('should return false for non-existent task', () => {
      const result = deleteTaskState(tempDir, 999);
      expect(result).toBe(false);
    });
  });
});
