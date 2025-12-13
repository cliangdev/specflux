import type { Node, Edge } from "reactflow";
import type { Epic } from "../../api/generated";

// Extended Epic type that includes v2 fields
type EpicWithV2 = Epic & { publicId?: string };

/**
 * Gets the unique identifier for an epic.
 * Uses publicId for v2 epics, id for v1 epics.
 */
function getEpicId(epic: EpicWithV2): string {
  return epic.publicId ?? epic.id.toString();
}

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
 * Supports both v1 epics (using numeric id) and v2 epics (using publicId).
 *
 * @param epics - Array of Epic objects from the API
 * @returns GraphData with nodes, edges, and any warnings (e.g., circular deps)
 */
export function transformEpicsToGraph(epics: Epic[]): GraphData {
  const warnings: string[] = [];
  const epicMap = new Map<string, EpicWithV2>();

  // Build a map for quick lookups using the appropriate identifier
  epics.forEach((epic) => {
    const id = getEpicId(epic as EpicWithV2);
    epicMap.set(id, epic as EpicWithV2);
  });

  // Create nodes for each epic
  const nodes: Node<EpicNodeData>[] = epics.map((epic) => {
    const epicWithV2 = epic as EpicWithV2;
    const progress = epic.progressPercentage ?? 0;
    const totalTasks = epic.taskStats?.total ?? 0;
    const doneTasks = epic.taskStats?.done ?? 0;

    return {
      id: getEpicId(epicWithV2),
      type: "epicNode", // Custom node type
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
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Helper function to detect cycles using DFS
  function hasCycle(epicId: string, path: string[] = []): boolean {
    if (recursionStack.has(epicId)) {
      const cycleStart = path.indexOf(epicId);
      const cyclePath = [...path.slice(cycleStart), epicId];
      warnings.push(
        `Circular dependency detected: ${cyclePath.map((id) => `Epic ${id}`).join(" -> ")}`,
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
      // Convert depId to string for comparison (handles both v1 number[] and v2 string[])
      const depIdStr = String(depId);
      if (hasCycle(depIdStr, [...path, epicId])) {
        return true;
      }
    }

    recursionStack.delete(epicId);
    return false;
  }

  // Check for cycles and create edges
  const processedEdges = new Set<string>();

  epics.forEach((epic) => {
    const epicWithV2 = epic as EpicWithV2;
    const epicId = getEpicId(epicWithV2);

    // Check for cycles starting from this epic
    if (!visited.has(epicId)) {
      hasCycle(epicId, []);
    }

    // Create edges for dependencies (dependency -> dependent)
    // The arrow points from the dependency TO the epic that depends on it
    const epicDeps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
    epicDeps.forEach((depId) => {
      // Convert depId to string for lookup (handles both v1 number[] and v2 string[])
      const depIdStr = String(depId);

      // Only create edge if the dependency exists in our epic list
      if (epicMap.has(depIdStr)) {
        const edgeId = `e${depIdStr}-${epicId}`;
        if (!processedEdges.has(edgeId)) {
          processedEdges.add(edgeId);
          edges.push({
            id: edgeId,
            source: depIdStr,
            target: epicId,
            animated: false,
            style: { stroke: "#6b7280" }, // surface-500 gray
          });
        }
      } else {
        warnings.push(
          `Epic ${epicId} depends on Epic ${depIdStr} which is not in the current view`,
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
  const dependedUpon = new Set<string>();
  epics.forEach((epic) => {
    const deps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
    deps.forEach((depId) => dependedUpon.add(String(depId)));
  });
  return epics.filter((epic) => {
    const epicId = getEpicId(epic as EpicWithV2);
    return !dependedUpon.has(epicId);
  });
}

export { getEpicId };
export default transformEpicsToGraph;
