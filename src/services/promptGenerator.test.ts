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

      expect(result).toContain('PRD "User Authentication"');
      expect(result).toContain("(SPEC-P1)");
      expect(result).toContain("status: DRAFT");
      expect(result).toContain("3 docs");
      expect(result).toContain("Refine PRD");
    });

    it("handles zero documents", () => {
      const result = generatePrdPrompt({
        title: "New Feature",
        displayKey: "SPEC-P2",
        status: "IN_REVIEW",
        documentCount: 0,
      });

      expect(result).toContain("0 docs");
    });
  });

  describe("generateEpicPrompt", () => {
    it("generates prompt with all fields filled", () => {
      const result = generateEpicPrompt({
        title: "Implement Auth Flow",
        displayKey: "SPEC-E1",
        status: "IN_PROGRESS",
        taskCount: 5,
      });

      expect(result).toContain('Epic "Implement Auth Flow"');
      expect(result).toContain("(SPEC-E1)");
      expect(result).toContain("status: IN_PROGRESS");
      expect(result).toContain("5 tasks");
      expect(result).toContain("Implement epic");
    });

    it("handles zero tasks", () => {
      const result = generateEpicPrompt({
        title: "Standalone Epic",
        displayKey: "SPEC-E2",
        status: "PLANNING",
        taskCount: 0,
      });

      expect(result).toContain("0 tasks");
    });
  });

  describe("generateTaskPrompt", () => {
    it("generates prompt with all fields filled", () => {
      const result = generateTaskPrompt({
        title: "Add login button",
        displayKey: "SPEC-T1",
        status: "READY",
        priority: "HIGH",
      });

      expect(result).toContain('Task "Add login button"');
      expect(result).toContain("(SPEC-T1)");
      expect(result).toContain("status: READY");
      expect(result).toContain("priority: HIGH");
      expect(result).toContain("Implement task");
    });
  });

  describe("generateProjectPrompt", () => {
    it("generates prompt with project info", () => {
      const result = generateProjectPrompt({
        name: "SpecFlux",
        projectKey: "SPEC",
      });

      expect(result).toContain('project "SpecFlux"');
      expect(result).toContain("(SPEC)");
      expect(result).toContain("Create new PRD");
    });
  });
});
