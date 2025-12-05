import {
  getClaudeMdTemplate,
  getMcpJsonTemplate,
  getPrdCommandTemplate,
  getEpicCommandTemplate,
  getDesignCommandTemplate,
  getImplementCommandTemplate,
  getTaskCommandTemplate,
} from '../services/template.service';

describe('TemplateService', () => {
  describe('getClaudeMdTemplate', () => {
    it('should include project name in header', () => {
      const result = getClaudeMdTemplate('My Project');
      expect(result).toContain('# My Project - Claude Code Guide');
    });

    it('should include available commands table', () => {
      const result = getClaudeMdTemplate('Test');
      expect(result).toContain('/prd');
      expect(result).toContain('/epic');
      expect(result).toContain('/design');
      expect(result).toContain('/implement');
      expect(result).toContain('/task');
    });

    it('should include file conventions', () => {
      const result = getClaudeMdTemplate('Test');
      expect(result).toContain('.specflux/prds/');
      expect(result).toContain('.specflux/epics/');
      expect(result).toContain('.specflux/task-states/');
    });
  });

  describe('getMcpJsonTemplate', () => {
    it('should return valid JSON', () => {
      const result = getMcpJsonTemplate();
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include github MCP server config', () => {
      const result = getMcpJsonTemplate();
      const parsed = JSON.parse(result);
      expect(parsed.mcpServers).toBeDefined();
      expect(parsed.mcpServers.github).toBeDefined();
    });
  });

  describe('getPrdCommandTemplate', () => {
    it('should include interview process', () => {
      const result = getPrdCommandTemplate();
      expect(result).toContain('Interview');
      expect(result).toContain('What are you building');
    });

    it('should include PRD structure', () => {
      const result = getPrdCommandTemplate();
      expect(result).toContain('Problem Statement');
      expect(result).toContain('Target Users');
      expect(result).toContain('Core Features');
    });

    it('should include save location', () => {
      const result = getPrdCommandTemplate();
      expect(result).toContain('.specflux/prds/');
    });
  });

  describe('getEpicCommandTemplate', () => {
    it('should include usage instructions', () => {
      const result = getEpicCommandTemplate();
      expect(result).toContain('/epic <epic-name>');
    });

    it('should include epic PRD structure', () => {
      const result = getEpicCommandTemplate();
      expect(result).toContain('User Stories');
      expect(result).toContain('Acceptance Criteria');
      expect(result).toContain('Technical Approach');
    });

    it('should include save location', () => {
      const result = getEpicCommandTemplate();
      expect(result).toContain('.specflux/epics/<epic-name>/epic.md');
    });
  });

  describe('getDesignCommandTemplate', () => {
    it('should include usage instructions', () => {
      const result = getDesignCommandTemplate();
      expect(result).toContain('/design <epic-name>');
    });

    it('should list document types', () => {
      const result = getDesignCommandTemplate();
      expect(result).toContain('API Design');
      expect(result).toContain('Database Schema');
      expect(result).toContain('Architecture');
    });
  });

  describe('getImplementCommandTemplate', () => {
    it('should include usage instructions', () => {
      const result = getImplementCommandTemplate();
      expect(result).toContain('/implement <epic-name>');
    });

    it('should include acceptance criteria workflow', () => {
      const result = getImplementCommandTemplate();
      expect(result).toContain('acceptance criteria');
    });
  });

  describe('getTaskCommandTemplate', () => {
    it('should include usage instructions', () => {
      const result = getTaskCommandTemplate();
      expect(result).toContain('/task <task-id>');
    });

    it('should include context injection info', () => {
      const result = getTaskCommandTemplate();
      expect(result).toContain('Chain inputs');
      expect(result).toContain('state file');
    });

    it('should include state file format', () => {
      const result = getTaskCommandTemplate();
      expect(result).toContain('Progress Log');
      expect(result).toContain('Chain Output');
    });
  });
});
