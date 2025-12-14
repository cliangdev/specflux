import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts";
import { useTerminal } from "../contexts/TerminalContext";
import { type Task } from "../api";
import { KanbanBoard, WorkflowTemplate } from "../components/kanban";
import TaskCreateModal from "../components/ui/TaskCreateModal";
import { generateAgentCommand } from "../utils/agentPrompts";

export default function BoardPage() {
  const { currentProject, getProjectRef } = useProject();
  const navigate = useNavigate();
  const { openTerminalForContext } = useTerminal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] =
    useState<WorkflowTemplate>("startup-fast");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load project config to get workflow template
  // Note: v2 API doesn't have projectConfig endpoint yet, using default template
  const loadProjectConfig = useCallback(async () => {
    if (!currentProject) return;
    // TODO: Add v2 project config endpoint when available
    // For now, use default "startup-fast" workflow template
  }, [currentProject]);

  useEffect(() => {
    loadProjectConfig();
  }, [loadProjectConfig]);

  const handleTaskClick = (task: Task) => {
    // Use publicId for v2 tasks, id for v1
    const taskWithV2 = task as Task & { publicId?: string };
    const taskRef = taskWithV2.publicId || task.id;
    navigate(`/tasks/${taskRef}`);
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    // Trigger board refresh by changing key
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenTerminal = (task: Task) => {
    openTerminalForContext({
      type: "task",
      id: task.id,
      title: task.title,
      displayKey: task.displayKey,
      projectRef: getProjectRef() ?? undefined,
      workingDirectory: currentProject?.localPath,
      initialCommand: generateAgentCommand({
        type: "task",
        title: task.title,
        displayKey: task.displayKey,
      }),
    });
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
          No Project Selected
        </h2>
        <p className="text-surface-500 dark:text-surface-400">
          Select a project from the sidebar to view its board.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <KanbanBoard
        key={refreshKey}
        projectId={0}
        projectRef={getProjectRef() ?? undefined}
        workflowTemplate={workflowTemplate}
        onTaskClick={handleTaskClick}
        onTaskCreate={() => setShowCreateModal(true)}
        onOpenTerminal={handleOpenTerminal}
      />

      {showCreateModal && (
        <TaskCreateModal
          projectId={getProjectRef() ?? currentProject.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
