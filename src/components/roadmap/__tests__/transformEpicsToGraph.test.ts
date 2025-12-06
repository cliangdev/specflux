import { describe, it, expect } from "vitest";
import {
  transformEpicsToGraph,
  getRootEpics,
  getLeafEpics,
} from "../transformEpicsToGraph";
import type { Epic } from "../../../api/generated";
import { EpicStatus } from "../../../api/generated";

// Helper to create mock epics
function createMockEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: "epic_1",
    displayKey: "EPIC-1",
    projectId: "proj_1",
    title: "Test Epic",
    status: EpicStatus.Planning,
    createdById: "user_1",
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
      createMockEpic({ id: "epic_1", title: "Epic 1" }),
      createMockEpic({ id: "epic_2", title: "Epic 2" }),
      createMockEpic({ id: "epic_3", title: "Epic 3" }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].id).toBe("epic_1");
    expect(result.nodes[0].data.label).toBe("Epic 1");
    expect(result.nodes[1].id).toBe("epic_2");
    expect(result.nodes[2].id).toBe("epic_3");
  });

  it("creates edges from dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: "epic_1", title: "Epic 1" }),
      createMockEpic({ id: "epic_2", title: "Epic 2", dependsOn: ["epic_1"] }),
      createMockEpic({
        id: "epic_3",
        title: "Epic 3",
        dependsOn: ["epic_1", "epic_2"],
      }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.edges).toHaveLength(3);
    // Edge from epic_1 to epic_2
    expect(
      result.edges.find((e) => e.source === "epic_1" && e.target === "epic_2"),
    ).toBeTruthy();
    // Edge from epic_1 to epic_3
    expect(
      result.edges.find((e) => e.source === "epic_1" && e.target === "epic_3"),
    ).toBeTruthy();
    // Edge from epic_2 to epic_3
    expect(
      result.edges.find((e) => e.source === "epic_2" && e.target === "epic_3"),
    ).toBeTruthy();
  });

  it("warns about missing dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({
        id: "epic_2",
        title: "Epic 2",
        dependsOn: ["epic_999"],
      }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("epic_2");
    expect(result.warnings[0]).toContain("epic_999");
    expect(result.warnings[0]).toContain("not in the current view");
  });

  it("detects circular dependencies", () => {
    const epics: Epic[] = [
      createMockEpic({ id: "epic_1", title: "Epic 1", dependsOn: ["epic_3"] }),
      createMockEpic({ id: "epic_2", title: "Epic 2", dependsOn: ["epic_1"] }),
      createMockEpic({ id: "epic_3", title: "Epic 3", dependsOn: ["epic_2"] }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.warnings.some((w) => w.includes("Circular dependency"))).toBe(
      true,
    );
  });

  it("includes progress data in node data", () => {
    const epics: Epic[] = [
      createMockEpic({
        id: "epic_1",
        title: "Epic 1",
        progressPercentage: 75,
        taskStats: { total: 4, done: 3, inProgress: 1, backlog: 0 },
      }),
    ];

    const result = transformEpicsToGraph(epics);

    expect(result.nodes[0].data.progress).toBe(75);
    expect(result.nodes[0].data.totalTasks).toBe(4);
    expect(result.nodes[0].data.doneTasks).toBe(3);
  });

  it("sets epicNode type for all nodes", () => {
    const epics: Epic[] = [
      createMockEpic({ id: "epic_1" }),
      createMockEpic({ id: "epic_2" }),
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
      createMockEpic({ id: "epic_1", title: "Root 1" }),
      createMockEpic({
        id: "epic_2",
        title: "Dependent",
        dependsOn: ["epic_1"],
      }),
      createMockEpic({ id: "epic_3", title: "Root 2", dependsOn: [] }),
    ];

    const roots = getRootEpics(epics);

    expect(roots).toHaveLength(2);
    expect(roots.map((e) => e.id)).toContain("epic_1");
    expect(roots.map((e) => e.id)).toContain("epic_3");
  });
});

describe("getLeafEpics", () => {
  it("returns epics that nothing depends on", () => {
    const epics: Epic[] = [
      createMockEpic({ id: "epic_1", title: "Dependency" }),
      createMockEpic({ id: "epic_2", title: "Leaf 1", dependsOn: ["epic_1"] }),
      createMockEpic({ id: "epic_3", title: "Leaf 2", dependsOn: ["epic_1"] }),
    ];

    const leaves = getLeafEpics(epics);

    expect(leaves).toHaveLength(2);
    expect(leaves.map((e) => e.id)).toContain("epic_2");
    expect(leaves.map((e) => e.id)).toContain("epic_3");
    expect(leaves.map((e) => e.id)).not.toContain("epic_1");
  });
});
