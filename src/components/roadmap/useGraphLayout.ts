import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "reactflow";

export interface LayoutOptions {
  direction?: "TB" | "LR" | "BT" | "RL";
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: "TB",
  nodeWidth: 250,
  nodeHeight: 80,
  horizontalSpacing: 50,
  verticalSpacing: 80,
};

/**
 * Custom hook that uses dagre to compute layout positions for nodes in a DAG.
 * Returns nodes with computed x/y positions.
 */
export function useGraphLayout<T = unknown>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: Node<T>[]; edges: Edge[] } {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return useMemo(() => {
    if (nodes.length === 0) {
      return { nodes: [], edges };
    }

    // Create a new dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Set graph options
    const {
      direction,
      nodeWidth,
      nodeHeight,
      horizontalSpacing,
      verticalSpacing,
    } = mergedOptions;
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: horizontalSpacing,
      ranksep: verticalSpacing,
    });

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: node.width ?? nodeWidth,
        height: node.height ?? nodeHeight,
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Apply calculated positions to nodes
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const width = node.width ?? nodeWidth;
      const height = node.height ?? nodeHeight;

      return {
        ...node,
        position: {
          // Center the node on the calculated position
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, [
    nodes,
    edges,
    mergedOptions.direction,
    mergedOptions.nodeWidth,
    mergedOptions.nodeHeight,
    mergedOptions.horizontalSpacing,
    mergedOptions.verticalSpacing,
  ]);
}

export default useGraphLayout;
