import { describe, it, expect } from "vitest";
import {
  generateClaudeMd,
  generateSessionPrompt,
  generateContextHeader,
  projectToConfig,
  type ProjectConfig,
  type SessionContext,
} from "../promptGenerator";

describe("promptGenerator", () => {
  describe("generateClaudeMd", () => {
    it("generates basic CLAUDE.md with project name", () => {
      const config: ProjectConfig = {
        name: "Test Project",
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("# CLAUDE.md");
      expect(result).toContain("Test Project");
      expect(result).toContain("This project is managed by SpecFlux");
    });

    it("includes project key when provided", () => {
      const config: ProjectConfig = {
        name: "Test Project",
        key: "TEST",
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("Test Project (TEST)");
    });

    it("includes custom tech stack", () => {
      const config: ProjectConfig = {
        name: "Test Project",
        techStack: {
          frontend: "Vue, TypeScript",
          backend: "Python, FastAPI",
          database: "MongoDB",
        },
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("Frontend: Vue, TypeScript");
      expect(result).toContain("Backend: Python, FastAPI");
      expect(result).toContain("Database: MongoDB");
    });

    it("includes custom project structure", () => {
      const config: ProjectConfig = {
        name: "Test Project",
        projectStructure: [
          "`app/` - Main application",
          "`tests/` - Test files",
        ],
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("- `app/` - Main application");
      expect(result).toContain("- `tests/` - Test files");
    });

    it("includes API endpoints table", () => {
      const config: ProjectConfig = {
        name: "Test Project",
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("| GET | /projects/{projectRef}/tasks/{ref}");
      expect(result).toContain("| PATCH | /projects/{projectRef}/tasks/{ref}");
      expect(result).toContain("?include=epics,tasks");
    });

    it("includes rules section", () => {
      const config: ProjectConfig = {
        name: "Test Project",
      };

      const result = generateClaudeMd(config);

      expect(result).toContain("## Rules");
      expect(result).toContain("ONE task at a time");
      expect(result).toContain("Test before marking done");
      expect(result).toContain("Commit after each task");
    });
  });

  describe("generateSessionPrompt", () => {
    it("generates task-scoped prompt", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        displayKey: "SPEC-42",
        title: "Implement feature",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("You are working on a SpecFlux task");
      expect(result).toContain("Task: SPEC-42 - Implement feature");
      expect(result).toContain("GET http://localhost:8090/api/projects/proj_abc/tasks/task_123");
      expect(result).toContain("Task details and acceptance criteria");
    });

    it("generates epic-scoped prompt", () => {
      const context: SessionContext = {
        scope: "epic",
        ref: "epic_456",
        displayKey: "SPEC-E1",
        title: "User Authentication",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("You are working on a SpecFlux epic");
      expect(result).toContain("Epic: SPEC-E1 - User Authentication");
      expect(result).toContain("GET http://localhost:8090/api/projects/proj_abc/epics/epic_456?include=tasks");
      expect(result).toContain("Epic details, session notes, and all tasks");
    });

    it("generates release-scoped prompt", () => {
      const context: SessionContext = {
        scope: "release",
        ref: "rel_789",
        displayKey: "v1.0",
        title: "MVP Release",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("You are working on a SpecFlux release");
      expect(result).toContain("Release: v1.0 - MVP Release");
      expect(result).toContain("GET http://localhost:8090/api/projects/proj_abc/releases/rel_789?include=epics,tasks");
      expect(result).toContain("Release with all epics and their tasks");
    });

    it("uses custom API base URL when provided", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        projectRef: "proj_abc",
        apiBaseUrl: "https://api.example.com",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("https://api.example.com/projects/proj_abc/tasks/task_123");
    });

    it("falls back to ref when displayKey not provided", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("Task: task_123");
    });

    it("includes all 8 steps", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain("## STEP 1: GET CONTEXT");
      expect(result).toContain("## STEP 2: SET UP ENVIRONMENT");
      expect(result).toContain("## STEP 3: VERIFY");
      expect(result).toContain("## STEP 4: IMPLEMENT");
      expect(result).toContain("## STEP 5: UPDATE STATUS");
      expect(result).toContain("## STEP 6: COMMIT");
      expect(result).toContain("## STEP 7: SESSION NOTES");
      expect(result).toContain("## STEP 8: CONTINUE OR END");
    });

    it("includes status update API call", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(context);

      expect(result).toContain('PATCH http://localhost:8090/api/projects/proj_abc/tasks/{taskRef}');
      expect(result).toContain('"status": "COMPLETED"');
    });

    it("includes epic notes update for epic/release scope", () => {
      const epicContext: SessionContext = {
        scope: "epic",
        ref: "epic_123",
        projectRef: "proj_abc",
      };

      const result = generateSessionPrompt(epicContext);

      expect(result).toContain("PUT http://localhost:8090/api/projects/proj_abc/epics/{epicRef}");
      expect(result).toContain('"notes":');
    });
  });

  describe("generateContextHeader", () => {
    it("generates task header with emoji", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        displayKey: "SPEC-42",
        title: "Test Task",
        projectRef: "proj_abc",
      };

      const result = generateContextHeader(context);

      expect(result).toBe("📋 TASK: SPEC-42 - Test Task");
    });

    it("generates epic header with emoji", () => {
      const context: SessionContext = {
        scope: "epic",
        ref: "epic_456",
        displayKey: "SPEC-E1",
        title: "Test Epic",
        projectRef: "proj_abc",
      };

      const result = generateContextHeader(context);

      expect(result).toBe("🎯 EPIC: SPEC-E1 - Test Epic");
    });

    it("generates release header with emoji", () => {
      const context: SessionContext = {
        scope: "release",
        ref: "rel_789",
        displayKey: "v1.0",
        title: "MVP",
        projectRef: "proj_abc",
      };

      const result = generateContextHeader(context);

      expect(result).toBe("🚀 RELEASE: v1.0 - MVP");
    });

    it("falls back to ref when displayKey not provided", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        projectRef: "proj_abc",
      };

      const result = generateContextHeader(context);

      expect(result).toBe("📋 TASK: task_123");
    });

    it("omits title when not provided", () => {
      const context: SessionContext = {
        scope: "task",
        ref: "task_123",
        displayKey: "SPEC-42",
        projectRef: "proj_abc",
      };

      const result = generateContextHeader(context);

      expect(result).toBe("📋 TASK: SPEC-42");
    });
  });

  describe("projectToConfig", () => {
    it("converts Project to ProjectConfig", () => {
      const project = {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        localPath: "/path/to/project",
        ownerId: "user_1",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const result = projectToConfig(project);

      expect(result.name).toBe("Test Project");
      expect(result.key).toBe("TEST");
      expect(result.localPath).toBe("/path/to/project");
      expect(result.techStack).toBeDefined();
    });

    it("handles undefined localPath", () => {
      const project = {
        id: "proj_123",
        name: "Test Project",
        projectKey: "TEST",
        // localPath is optional, so we omit it
        ownerId: "user_1",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const result = projectToConfig(project);

      expect(result.key).toBe("TEST");
      expect(result.localPath).toBeUndefined();
    });
  });
});
