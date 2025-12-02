import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts";
import { useTerminal } from "../contexts/TerminalContext";
import { api, type Task } from "../api";
import { v2Api } from "../api/v2/client";
import { KanbanBoard, WorkflowTemplate } from "../components/kanban";
import TaskCreateModal from "../components/ui/TaskCreateModal";

export default function BoardPage() {
  const { currentProject, usingV2, getProjectRef } = useProject();
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
      if (usingV2) {
        const projectRef = getProjectRef();
        if (!projectRef) return;
        // v2 API may not have projectConfig endpoint yet, use default
        // TODO: Add v2 project config endpoint
        console.log("[BoardPage] Using default workflow template for v2");
      } else {
        const response = await api.projects.getProjectConfig({
          id: currentProject.id,
        });
        if (response.success && response.data) {
          const template = response.data.workflowTemplate as WorkflowTemplate;
          if (template) {
            setWorkflowTemplate(template);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load project config:", err);
    }
  }, [currentProject, usingV2, getProjectRef]);

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
    // Use publicId for v2 tasks, id for v1
    const taskWithV2 = task as Task & { publicId?: string };
    const taskRef = taskWithV2.publicId || String(task.id);
    openTerminalForTask({ id: taskRef, title: task.title });
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
        projectRef={getProjectRef() ?? undefined}
        usingV2={usingV2}
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
