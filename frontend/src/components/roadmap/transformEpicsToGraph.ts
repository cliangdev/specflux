import type { Node, Edge } from "reactflow";
import type { Epic } from "../../api/generated";

/**
 * Data structure attached to each epic node in the graph.
 */
export interface EpicNodeData {
  epic: Epic;
  label: string;
  progress: number;
  status: string;
  totalTasks: number;
  doneTasks: number;
}

/**
 * Result of the graph transformation.
 */
export interface GraphData {
  nodes: Node<EpicNodeData>[];
  edges: Edge[];
  warnings: string[];
}

/**
 * Transforms an array of epics into React Flow nodes and edges.
 *
 * @param epics - Array of Epic objects from the API
 * @returns GraphData with nodes, edges, and any warnings (e.g., circular deps)
 */
export function transformEpicsToGraph(epics: Epic[]): GraphData {
  const warnings: string[] = [];
  const epicMap = new Map<number, Epic>();

  // Build a map for quick lookups
  epics.forEach((epic) => {
    epicMap.set(epic.id, epic);
  });

  // Create nodes for each epic
  const nodes: Node<EpicNodeData>[] = epics.map((epic) => {
    const progress = epic.progressPercentage ?? 0;
    const totalTasks = epic.taskStats?.total ?? 0;
    const doneTasks = epic.taskStats?.done ?? 0;

    return {
      id: epic.id.toString(),
      type: "epicNode", // Custom node type (will be implemented in Task #80)
      position: { x: 0, y: 0 }, // Will be set by dagre layout
      data: {
        epic,
        label: epic.title,
        progress,
        status: epic.status,
        totalTasks,
        doneTasks,
      },
    };
  });

  // Create edges from dependencies
  const edges: Edge[] = [];
  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  // Helper function to detect cycles using DFS
  function hasCycle(epicId: number, path: number[] = []): boolean {
    if (recursionStack.has(epicId)) {
      const cycleStart = path.indexOf(epicId);
      const cyclePath = [...path.slice(cycleStart), epicId];
      warnings.push(
        `Circular dependency detected: ${cyclePath.map((id) => `Epic #${id}`).join(" -> ")}`,
      );
      return true;
    }

    if (visited.has(epicId)) {
      return false;
    }

    visited.add(epicId);
    recursionStack.add(epicId);

    const epic = epicMap.get(epicId);
    const deps = Array.isArray(epic?.dependsOn) ? epic.dependsOn : [];
    for (const depId of deps) {
      if (hasCycle(depId, [...path, epicId])) {
        return true;
      }
    }

    recursionStack.delete(epicId);
    return false;
  }

  // Check for cycles and create edges
  const processedEdges = new Set<string>();

  epics.forEach((epic) => {
    // Check for cycles starting from this epic
    if (!visited.has(epic.id)) {
      hasCycle(epic.id, []);
    }

    // Create edges for dependencies (dependency -> dependent)
    // The arrow points from the dependency TO the epic that depends on it
    const epicDeps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
    epicDeps.forEach((depId) => {
      // Only create edge if the dependency exists in our epic list
      if (epicMap.has(depId)) {
        const edgeId = `e${depId}-${epic.id}`;
        if (!processedEdges.has(edgeId)) {
          processedEdges.add(edgeId);
          edges.push({
            id: edgeId,
            source: depId.toString(),
            target: epic.id.toString(),
            animated: false,
            style: { stroke: "#6b7280" }, // system-500 gray
          });
        }
      } else {
        warnings.push(
          `Epic #${epic.id} depends on Epic #${depId} which is not in the current view`,
        );
      }
    });
  });

  return { nodes, edges, warnings };
}

/**
 * Identifies epics that have no dependencies (root nodes).
 * These should appear in the leftmost column of the graph.
 */
export function getRootEpics(epics: Epic[]): Epic[] {
  return epics.filter((epic) => !epic.dependsOn || epic.dependsOn.length === 0);
}

/**
 * Identifies epics that no other epic depends on (leaf nodes).
 * These are the "final" deliverables in the dependency chain.
 */
export function getLeafEpics(epics: Epic[]): Epic[] {
  const dependedUpon = new Set<number>();
  epics.forEach((epic) => {
    const deps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
    deps.forEach((depId) => dependedUpon.add(depId));
  });
  return epics.filter((epic) => !dependedUpon.has(epic.id));
}

export default transformEpicsToGraph;
