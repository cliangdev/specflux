import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, {
  Node,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import type { Epic } from "../../api/generated";
import { useGraphLayout } from "./useGraphLayout";
import {
  transformEpicsToGraph,
  type EpicNodeData,
} from "./transformEpicsToGraph";
import EpicNode from "./EpicNode";
import EpicDetailPopup from "./EpicDetailPopup";
import GraphToolbar from "./GraphToolbar";

// Register custom node types - must be defined outside component to prevent re-renders
const nodeTypes: NodeTypes = {
  epicNode: EpicNode,
};

export interface EpicGraphProps {
  epics: Epic[];
  onEpicClick?: (epic: Epic) => void;
  onEpicDoubleClick?: (epic: Epic) => void;
  className?: string;
}

interface PopupState {
  epic: Epic;
  position: { x: number; y: number };
}

function EpicGraphInner({
  epics,
  onEpicClick,
  onEpicDoubleClick,
  className,
}: EpicGraphProps) {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const [popup, setPopup] = useState<PopupState | null>(null);

  // Transform epics to graph data
  const graphData = useMemo(() => transformEpicsToGraph(epics), [epics]);

  // Log any warnings (e.g., circular dependencies)
  useEffect(() => {
    if (graphData.warnings.length > 0) {
      console.warn("Epic Graph Warnings:", graphData.warnings);
    }
  }, [graphData.warnings]);

  // Apply dagre layout to position nodes
  const { nodes: layoutedNodes, edges: layoutedEdges } = useGraphLayout(
    graphData.nodes,
    graphData.edges,
    { direction: "TB", nodeWidth: 250, nodeHeight: 100 },
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes when epics change and re-fit the view
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // Delay fitView to allow React Flow to process the node updates
    const timeoutId = setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<EpicNodeData>) => {
      if (node.data?.epic) {
        // Calculate popup position based on click location
        const rect = (event.target as HTMLElement)
          .closest(".react-flow")
          ?.getBoundingClientRect();
        if (rect) {
          setPopup({
            epic: node.data.epic,
            position: {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            },
          });
        }
        onEpicClick?.(node.data.epic);
      }
    },
    [onEpicClick],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<EpicNodeData>) => {
      if (node.data?.epic) {
        // Navigate to epic detail page
        navigate(`/epics/${node.data.epic.id}`);
        onEpicDoubleClick?.(node.data.epic);
      }
    },
    [navigate, onEpicDoubleClick],
  );

  const handleClosePopup = useCallback(() => {
    setPopup(null);
  }, []);

  const handleNavigateToEpic = useCallback(() => {
    if (popup?.epic) {
      navigate(`/epics/${popup.epic.id}`);
      setPopup(null);
    }
  }, [popup, navigate]);

  // Close popup on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && popup) {
        setPopup(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popup]);

  if (epics.length === 0) {
    return (
      <div
        className={`w-full min-h-[400px] bg-system-50 dark:bg-system-900 rounded-lg border border-system-200 dark:border-system-700 flex items-center justify-center ${className ?? ""}`}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-system-400 dark:text-system-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="mt-2 text-system-500 dark:text-system-400">
            No epics to display
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full min-h-[400px] bg-system-50 dark:bg-system-900 rounded-lg border border-system-200 dark:border-system-700 ${className ?? ""}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={handleClosePopup}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        panOnScroll
        zoomOnScroll
        panOnDrag
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          className="bg-system-50 dark:bg-system-900"
        />
        <GraphToolbar />
      </ReactFlow>

      {/* Detail popup */}
      {popup && (
        <EpicDetailPopup
          epic={popup.epic}
          allEpics={epics}
          position={popup.position}
          onClose={handleClosePopup}
          onNavigate={handleNavigateToEpic}
        />
      )}
    </div>
  );
}

/**
 * EpicGraph component renders an interactive dependency graph of epics using React Flow.
 * Epics are displayed as nodes, with edges representing dependencies.
 *
 * Features:
 * - Click node to show detail popup
 * - Double-click node to navigate to epic detail page
 * - Pan with mouse drag
 * - Zoom with scroll wheel
 * - Toolbar with zoom controls and fit-to-screen
 */
export default function EpicGraph(props: EpicGraphProps) {
  return (
    <ReactFlowProvider>
      <EpicGraphInner {...props} />
    </ReactFlowProvider>
  );
}
