import { describe, it, expect } from "vitest";
import {
  transformEpicsToGraph,
  getRootEpics,
  getLeafEpics,
} from "../transformEpicsToGraph";
import type { Epic } from "../../../api/generated";

// Helper to create mock epics
function createMockEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 1,
    projectId: 1,
    title: "Test Epic",
    status: "active",
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("transformEpicsToGraph", () => {
  it("returns empty arrays for empty input", () => {
    const result = transformEpicsToGraph([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("creates nodes for each epic", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1, title: "Epic 1" }),
      createMockEpic({ id: 2, title: "Epic 2" }),
      createMockEpic({ id: 3, title: "Epic 3" }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].id).toBe("1");
    expect(result.nodes[0].data.label).toBe("Epic 1");
    expect(result.nodes[1].id).toBe("2");
    expect(result.nodes[2].id).toBe("3");
  });

  it("creates edges from dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1, title: "Epic 1" }),
      createMockEpic({ id: 2, title: "Epic 2", dependsOn: [1] }),
      createMockEpic({ id: 3, title: "Epic 3", dependsOn: [1, 2] }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.edges).toHaveLength(3);
    // Edge from 1 to 2
    expect(
      result.edges.find((e) => e.source === "1" && e.target === "2"),
    ).toBeTruthy();
    // Edge from 1 to 3
    expect(
      result.edges.find((e) => e.source === "1" && e.target === "3"),
    ).toBeTruthy();
    // Edge from 2 to 3
    expect(
      result.edges.find((e) => e.source === "2" && e.target === "3"),
    ).toBeTruthy();
  });

  it("warns about missing dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 2, title: "Epic 2", dependsOn: [999] }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Epic #2");
    expect(result.warnings[0]).toContain("Epic #999");
    expect(result.warnings[0]).toContain("not in the current view");
  });

  it("detects circular dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1, title: "Epic 1", dependsOn: [3] }),
      createMockEpic({ id: 2, title: "Epic 2", dependsOn: [1] }),
      createMockEpic({ id: 3, title: "Epic 3", dependsOn: [2] }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.warnings.some((w) => w.includes("Circular dependency"))).toBe(
      true,
    );
  });

  it("includes progress data in node data", () => {
    const epics: Epic[] = [
      createMockEpic({
        id: 1,
        title: "Epic 1",
        progressPercentage: 75,
        taskStats: { total: 4, done: 3, inProgress: 1 },
      }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.nodes[0].data.progress).toBe(75);
    expect(result.nodes[0].data.totalTasks).toBe(4);
    expect(result.nodes[0].data.doneTasks).toBe(3);
  });

  it("sets epicNode type for all nodes", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1 }),
      createMockEpic({ id: 2 }),
    ];

    const result = transformEpicsToGraph(epics);

    result.nodes.forEach((node) => {
      expect(node.type).toBe("epicNode");
    });
  });
});

describe("getRootEpics", () => {
  it("returns epics with no dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1, title: "Root 1" }),
      createMockEpic({ id: 2, title: "Dependent", dependsOn: [1] }),
      createMockEpic({ id: 3, title: "Root 2", dependsOn: [] }),
    ];

    const roots = getRootEpics(epics);

    expect(roots).toHaveLength(2);
    expect(roots.map((e) => e.id)).toContain(1);
    expect(roots.map((e) => e.id)).toContain(3);
  });
});

describe("getLeafEpics", () => {
  it("returns epics that nothing depends on", () => {
    const epics: Epic[] = [
      createMockEpic({ id: 1, title: "Dependency" }),
      createMockEpic({ id: 2, title: "Leaf 1", dependsOn: [1] }),
      createMockEpic({ id: 3, title: "Leaf 2", dependsOn: [1] }),
    ];

    const leaves = getLeafEpics(epics);

    expect(leaves).toHaveLength(2);
    expect(leaves.map((e) => e.id)).toContain(2);
    expect(leaves.map((e) => e.id)).toContain(3);
    expect(leaves.map((e) => e.id)).not.toContain(1);
  });
});
