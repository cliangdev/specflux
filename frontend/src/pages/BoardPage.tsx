import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts";
import { useTerminal } from "../contexts/TerminalContext";
import { api, type Task } from "../api";
import { KanbanBoard, WorkflowTemplate } from "../components/kanban";
import TaskCreateModal from "../components/ui/TaskCreateModal";

export default function BoardPage() {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const { openTerminalForTask } = useTerminal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] =
    useState<WorkflowTemplate>("startup-fast");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load project config to get workflow template
  const loadProjectConfig = useCallback(async () => {
    if (!currentProject) return;

    try {
      const response = await api.projects.getProjectConfig({
        id: currentProject.id,
      });
      if (response.success && response.data) {
        const template = response.data.workflowTemplate as WorkflowTemplate;
        if (template) {
          setWorkflowTemplate(template);
        }
      }
    } catch (err) {
      console.error("Failed to load project config:", err);
    }
  }, [currentProject]);

  useEffect(() => {
    loadProjectConfig();
  }, [loadProjectConfig]);

  const handleTaskClick = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    // Trigger board refresh by changing key
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenTerminal = (task: Task) => {
    openTerminalForTask({ id: task.id, title: task.title });
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-system-900 dark:text-white mb-2">
          No Project Selected
        </h2>
        <p className="text-system-500 dark:text-system-400">
          Select a project from the sidebar to view its board.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <KanbanBoard
        key={refreshKey}
        projectId={currentProject.id}
        workflowTemplate={workflowTemplate}
        onTaskClick={handleTaskClick}
        onTaskCreate={() => setShowCreateModal(true)}
        onOpenTerminal={handleOpenTerminal}
      />

      {showCreateModal && (
        <TaskCreateModal
          projectId={currentProject.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
