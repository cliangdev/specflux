import { describe, it, expect } from "vitest";
import {
  generatePrdPrompt,
  generateEpicPrompt,
  generateTaskPrompt,
  generateProjectPrompt,
} from "./promptGenerator";

describe("promptGenerator", () => {
  describe("generatePrdPrompt", () => {
    it("generates prompt with all fields filled", () => {
      const result = generatePrdPrompt({
        title: "User Authentication",
        displayKey: "SPEC-P1",
        status: "DRAFT",
        documentCount: 3,
      });

      expect(result).toContain('PRD: "User Authentication"');
      expect(result).toContain("(SPEC-P1)");
      expect(result).toContain("Status: DRAFT");
      expect(result).toContain("Documents: 3");
      expect(result).toContain("Refine this PRD");
      expect(result).toContain("Break down into epics");
    });

    it("handles zero documents", () => {
      const result = generatePrdPrompt({
        title: "New Feature",
        displayKey: "SPEC-P2",
        status: "IN_REVIEW",
        documentCount: 0,
      });

      expect(result).toContain("Documents: 0");
    });
  });

  describe("generateEpicPrompt", () => {
    it("generates prompt with all fields filled", () => {
      const result = generateEpicPrompt({
        title: "Implement Auth Flow",
        displayKey: "SPEC-E1",
        status: "IN_PROGRESS",
        taskCount: 5,
        prdDisplayKey: "SPEC-P1",
      });

      expect(result).toContain('Epic: "Implement Auth Flow"');
      expect(result).toContain("(SPEC-E1)");
      expect(result).toContain("Status: IN_PROGRESS");
      expect(result).toContain("Tasks: 5");
      expect(result).toContain("PRD: SPEC-P1");
      expect(result).toContain("Implement this epic");
    });

    it("handles missing prdDisplayKey", () => {
      const result = generateEpicPrompt({
        title: "Standalone Epic",
        displayKey: "SPEC-E2",
        status: "PLANNING",
        taskCount: 0,
      });

      expect(result).toContain("PRD: N/A");
    });
  });

  describe("generateTaskPrompt", () => {
    it("generates prompt with all fields filled", () => {
      const result = generateTaskPrompt({
        title: "Add login button",
        displayKey: "SPEC-T1",
        status: "READY",
        priority: "HIGH",
        epicDisplayKey: "SPEC-E1",
      });

      expect(result).toContain('Task: "Add login button"');
      expect(result).toContain("(SPEC-T1)");
      expect(result).toContain("Status: READY");
      expect(result).toContain("Priority: HIGH");
      expect(result).toContain("Epic: SPEC-E1");
      expect(result).toContain("Implement this task");
    });

    it("handles missing epicDisplayKey", () => {
      const result = generateTaskPrompt({
        title: "Orphan Task",
        displayKey: "SPEC-T2",
        status: "BACKLOG",
        priority: "LOW",
      });

      expect(result).toContain("Epic: N/A");
    });
  });

  describe("generateProjectPrompt", () => {
    it("generates prompt with project info", () => {
      const result = generateProjectPrompt({
        name: "SpecFlux",
        projectKey: "SPEC",
      });

      expect(result).toContain('project: "SpecFlux"');
      expect(result).toContain("(SPEC)");
      expect(result).toContain("Create a new PRD");
      expect(result).toContain("View existing PRDs");
    });
  });
});
