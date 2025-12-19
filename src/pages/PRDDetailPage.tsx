import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { ask } from "@tauri-apps/plugin-dialog";
import DocumentViewer from "../components/ui/DocumentViewer";
import { DetailPageHeader } from "../components/ui/DetailPageHeader";
import { AIActionButton } from "../components/ui/AIActionButton";
import { EpicsSection } from "../components/prd/EpicsSection";
import { EpicCreateModal } from "../components/epics";
import { GettingStartedBanner } from "../components/prds/GettingStartedBanner";
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
import { generatePrdPrompt } from "../services/promptGenerator";

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
  const location = useLocation();
  const { currentProject, getProjectRef } = useProject();

  const prdRef = prdName ? decodeURIComponent(prdName) : "";

  // Check if we should show getting started banner (from navigation state)
  const locationState = location.state as {
    showGettingStarted?: boolean;
    hasDocument?: boolean;
  } | null;

  const [prd, setPrd] = useState<Prd | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<PrdDocument | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    // Check if user dismissed the banner for this PRD
    const dismissed = localStorage.getItem(`prd-banner-dismissed-${prdRef}`);
    return dismissed === "true";
  });

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
  const [showCreateEpicModal, setShowCreateEpicModal] = useState(false);

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

    const confirmed = await ask(`Delete PRD "${prd.title}"? This cannot be undone.`, {
      title: "Delete PRD",
      kind: "warning",
    });

    if (!confirmed) return;

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

  const handleDeleteDocument = async (doc: PrdDocument) => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd) return;

    // Don't allow deleting the primary document
    if (doc.isPrimary) {
      await ask("Cannot delete the primary document. Set another document as primary first.", {
        title: "Cannot Delete",
        kind: "error",
      });
      return;
    }

    const confirmed = await ask(`Remove "${doc.fileName}" from this PRD?`, {
      title: "Remove Document",
      kind: "warning",
    });

    if (!confirmed) return;

    try {
      await api.prds.deletePrdDocument({
        projectRef,
        prdRef: prd.id,
        docId: doc.id,
      });

      // Refresh PRD to get updated documents list
      const updated = await api.prds.getPrd({ projectRef, prdRef: prd.id });
      setPrd(updated);

      // If we deleted the selected doc, select the primary or first doc
      if (selectedDoc?.id === doc.id && updated.documents && updated.documents.length > 0) {
        const primaryDoc = updated.documents.find((d) => d.isPrimary) || updated.documents[0];
        setSelectedDoc(primaryDoc);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document");
    }
  };

  const handleStartWork = () => {
    if (prd) {
      const initialPrompt = generatePrdPrompt({
        title: prd.title,
        displayKey: prd.displayKey || prd.id,
        status: prd.status,
        documentCount: prd.documents?.length ?? 0,
      });

      const context = {
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: "claude",
        initialPrompt,
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

  // Getting Started banner handlers
  const handleDraftWithClaude = () => {
    if (prd) {
      openTerminalForContext({
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: `claude "/prd draft"`,
      });
    }
  };

  const handleRefineWithClaude = () => {
    if (prd) {
      openTerminalForContext({
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: `claude "/prd refine"`,
      });
    }
  };

  const handleCreateEpicsFromBanner = () => {
    if (prd) {
      openTerminalForContext({
        type: "prd" as const,
        id: prd.id,
        title: prd.title,
        displayKey: prd.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: `claude "/epic"`,
      });
    }
  };

  const handleAddDocsFromBanner = () => {
    setShowAddDocModal(true);
  };

  const handleDismissGettingStarted = () => {
    setBannerDismissed(true);
    // Persist dismissal in localStorage
    if (prd) {
      localStorage.setItem(`prd-banner-dismissed-${prd.id}`, "true");
    }
    // Clear the navigation state
    window.history.replaceState({}, document.title);
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

      {/* Getting Started Banner - show if not dismissed AND (from create modal OR no documents) */}
      {!bannerDismissed &&
        prd &&
        (locationState?.showGettingStarted || (prd.documents?.length ?? 0) === 0) && (
          <div className="px-6 pt-4">
            <GettingStartedBanner
              prdId={prd.id}
              hasDocument={(prd.documents?.length ?? 0) > 0}
              onDraftWithClaude={handleDraftWithClaude}
              onRefineWithClaude={handleRefineWithClaude}
              onCreateEpics={handleCreateEpicsFromBanner}
              onAddDocs={handleAddDocsFromBanner}
              onDismiss={handleDismissGettingStarted}
            />
          </div>
        )}

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
                  <li key={doc.id} className="group relative">
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
                    {/* Delete button - only show for non-primary documents */}
                    {!doc.isPrimary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        title="Remove document"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Epics Section */}
          <div className="p-4 border-t border-surface-200 dark:border-surface-700">
            <EpicsSection
              epics={epics}
              onAddEpic={() => setShowCreateEpicModal(true)}
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

      {/* Create Epic Modal */}
      {showCreateEpicModal && (
        <EpicCreateModal
          projectId={getProjectRef() || ""}
          onClose={() => setShowCreateEpicModal(false)}
          onCreated={() => {
            setShowCreateEpicModal(false);
            loadEpics();
          }}
        />
      )}
    </div>
  );
}
