import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import DocumentViewer from "../components/ui/DocumentViewer";
import { DetailPageHeader } from "../components/ui/DetailPageHeader";
import { AIActionButton } from "../components/ui/AIActionButton";
import { EpicsSection } from "../components/prd/EpicsSection";
import { useProject } from "../contexts/ProjectContext";
import { usePageContext } from "../hooks/usePageContext";
import { useTerminal } from "../contexts/TerminalContext";
import {
  api,
  type Prd,
  type PrdDocument,
  type Epic,
  PrdStatus,
  PrdDocumentType,
  type AddPrdDocumentRequest,
} from "../api";
import { ImportDocumentModal } from "../components/prds/ImportDocumentModal";
import { generateAgentCommand } from "../utils/agentPrompts";

// Status options for PRDs
const PRD_STATUS_OPTIONS = [
  { value: PrdStatus.Draft, label: "Draft" },
  { value: PrdStatus.InReview, label: "In Review" },
  { value: PrdStatus.Approved, label: "Approved" },
  { value: PrdStatus.Implemented, label: "Implemented" },
  { value: PrdStatus.Archived, label: "Archived" },
];

function getDocumentTypeIcon(type: PrdDocumentType): JSX.Element {
  switch (type) {
    case PrdDocumentType.Prd:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case PrdDocumentType.Wireframe:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      );
    case PrdDocumentType.Mockup:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case PrdDocumentType.Design:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
  }
}

export default function PRDDetailPage() {
  const { prdName } = useParams<{ prdName: string }>();
  const navigate = useNavigate();
  const { currentProject, getProjectRef } = useProject();

  const prdRef = prdName ? decodeURIComponent(prdName) : "";

  const [prd, setPrd] = useState<Prd | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<PrdDocument | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);

  // Terminal context for AI actions
  const { openTerminalForContext, getExistingSession, switchToSession, activeSession, isRunning } = useTerminal();

  // Set page context for terminal suggested commands - use displayKey once PRD is loaded
  usePageContext(
    prd
      ? { type: "prd-detail", id: prd.id, title: prd.displayKey || prd.title }
      : null,
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  const loadPrd = useCallback(async () => {
    const projectRef = getProjectRef();
    if (!projectRef || !prdRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prdData = await api.prds.getPrd({ projectRef, prdRef });
      setPrd(prdData);

      // Select primary document or first document
      if (prdData.documents && prdData.documents.length > 0) {
        const primaryDoc =
          prdData.documents.find((d) => d.isPrimary) || prdData.documents[0];
        setSelectedDoc(primaryDoc);
      }
    } catch (err) {
      console.error("Failed to load PRD:", err);
      setError(err instanceof Error ? err.message : "Failed to load PRD");
    } finally {
      setLoading(false);
    }
  }, [getProjectRef, prdRef]);

  // Load epics linked to this PRD
  const loadEpics = useCallback(async () => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd?.id) {
      return;
    }

    setEpicsLoading(true);
    try {
      const response = await api.epics.listEpics({ projectRef, prdRef: prd.id });
      setEpics(response.data ?? []);
    } catch (err) {
      console.error("Failed to load epics:", err);
      setEpics([]);
    } finally {
      setEpicsLoading(false);
    }
  }, [getProjectRef, prd?.id]);

  // Load file content when selection changes
  const loadContent = useCallback(async () => {
    if (!currentProject?.localPath || !selectedDoc) {
      setContent("");
      return;
    }

    setContentLoading(true);

    try {
      // Construct full path from project root
      const filePath = await join(
        currentProject.localPath,
        selectedDoc.filePath,
      );

      const text = await readTextFile(filePath);
      setContent(text);
    } catch (err) {
      console.error("Failed to load file content:", err);
      setContent(
        `*Error loading file: ${err instanceof Error ? err.message : "Unknown error"}*`,
      );
    } finally {
      setContentLoading(false);
    }
  }, [currentProject?.localPath, selectedDoc]);

  useEffect(() => {
    loadPrd();
  }, [loadPrd]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    loadEpics();
  }, [loadEpics]);

  const handleBack = () => {
    navigate("/prds");
  };

  const handleDocSelect = (doc: PrdDocument) => {
    setSelectedDoc(doc);
  };

  const handleStatusChange = async (newStatus: string) => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd) return;

    try {
      const updated = await api.prds.updatePrd({
        projectRef,
        prdRef: prd.id,
        updatePrdRequest: { status: newStatus as PrdStatus },
      });
      setPrd(updated);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async () => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd) return;

    if (!confirm(`Delete PRD "${prd.title}"? This cannot be undone.`)) return;

    try {
      await api.prds.deletePrd({ projectRef, prdRef: prd.id });
      navigate("/prds");
    } catch (err) {
      console.error("Failed to delete PRD:", err);
    }
  };

  const handleAddDocument = async (data: {
    fileName: string;
    filePath: string;
    documentType: PrdDocumentType;
  }) => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd) return;

    const request: AddPrdDocumentRequest = {
      fileName: data.fileName,
      filePath: data.filePath,
      documentType: data.documentType,
    };

    const updated = await api.prds.addPrdDocument({
      projectRef,
      prdRef: prd.id,
      addPrdDocumentRequest: request,
    });

    setPrd(updated);

    // Select the newly added document
    if (updated.documents && updated.documents.length > 0) {
      const newDoc = updated.documents.find(
        (d) => d.filePath === data.filePath
      );
      if (newDoc) {
        setSelectedDoc(newDoc);
      }
    }
  };

  // AI Action handlers
  const handleStartWork = () => {
    if (prd) {
      const context = {
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: generateAgentCommand({
          type: "prd",
          title: prd.title,
          displayKey: prd.displayKey,
        }),
      };

      // Check if session already exists - switch to it directly
      const existing = getExistingSession(context);
      if (existing) {
        switchToSession(existing.id);
      } else {
        openTerminalForContext(context);
      }
    }
  };

  const handleContinueWork = () => {
    if (prd) {
      const context = {
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
      };
      const existing = getExistingSession(context);
      if (existing) {
        switchToSession(existing.id);
      }
    }
  };

  // Check if terminal has existing session for this PRD
  const hasExistingSession = prd
    ? !!getExistingSession({
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
      })
    : false;

  // Check if terminal is showing this PRD
  const isTerminalShowingThisPrd = activeSession?.contextId === prd?.id;

  // No project
  if (!currentProject?.localPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-surface-500 dark:text-surface-400">
            Project path not configured.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 text-accent-600 hover:text-accent-700 dark:text-accent-400"
          >
            Back to PRDs
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-500 dark:text-surface-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !prd) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            {error || "PRD not found"}
          </div>
          <button
            onClick={handleBack}
            className="text-accent-600 hover:text-accent-700 dark:text-accent-400"
          >
            Back to PRDs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <DetailPageHeader
        backTo="/prds"
        entityKey={prd.displayKey}
        title={prd.title}
        status={prd.status}
        statusOptions={PRD_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        badges={[
          { label: "Documents", value: `${prd.documents?.length ?? 0} files` },
          { label: "Epics", value: `${epics.length}` },
        ]}
        createdAt={prd.createdAt}
        updatedAt={prd.updatedAt}
        primaryAction={
          <AIActionButton
            entityType="prd"
            entityId={prd.id}
            entityTitle={prd.title}
            hasExistingSession={hasExistingSession}
            isTerminalActive={isTerminalShowingThisPrd && isRunning}
            onStartWork={handleStartWork}
            onContinueWork={hasExistingSession ? handleContinueWork : undefined}
          />
        }
        actions={[
          {
            label: "Delete PRD",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            onClick: handleDelete,
            variant: "danger" as const,
          },
        ]}
        isLoading={loading}
      />

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto scrollbar-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                Documents
              </h2>
              <button
                onClick={() => setShowAddDocModal(true)}
                className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
              >
                + Import
              </button>
            </div>
            {!prd.documents || prd.documents.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                No documents
              </p>
            ) : (
              <ul className="space-y-1">
                {prd.documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => handleDocSelect(doc)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedDoc?.id === doc.id
                          ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium"
                          : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-shrink-0 ${
                            selectedDoc?.id === doc.id
                              ? "text-accent-600 dark:text-accent-400"
                              : "text-surface-400 dark:text-surface-500"
                          }`}
                        >
                          {getDocumentTypeIcon(doc.documentType)}
                        </span>
                        <span className="truncate flex-1">{doc.fileName}</span>
                        {doc.isPrimary && (
                          <span className="text-xs text-accent-500 dark:text-accent-400">
                            Primary
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Epics Section */}
          <div className="p-4 border-t border-surface-200 dark:border-surface-700">
            <EpicsSection
              epics={epics}
              onAddEpic={() => navigate(`/epics/new?prdRef=${prd.id}`)}
              loading={epicsLoading}
            />
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto">
          {contentLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-surface-500 dark:text-surface-400">
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </div>
            </div>
          ) : !selectedDoc ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2 text-surface-500 dark:text-surface-400">
                  No documents in this PRD
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 h-full">
              <DocumentViewer
                content={content}
                fileName={selectedDoc.fileName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Import Document Modal */}
      <ImportDocumentModal
        isOpen={showAddDocModal}
        onClose={() => setShowAddDocModal(false)}
        onImport={handleAddDocument}
        prdFolderPath={prd.folderPath}
        projectPath={currentProject.localPath}
      />
    </div>
  );
}
