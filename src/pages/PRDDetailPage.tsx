import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import DocumentViewer from "../components/ui/DocumentViewer";
import { useProject } from "../contexts/ProjectContext";
import { usePageContext } from "../hooks/usePageContext";
import {
  api,
  type Prd,
  type PrdDocument,
  PrdStatus,
  PrdDocumentType,
  type AddPrdDocumentRequest,
} from "../api";
import { ImportDocumentModal } from "../components/prds/ImportDocumentModal";

function getStatusBadgeClasses(status: PrdStatus): string {
  switch (status) {
    case PrdStatus.Draft:
      return "bg-system-100 dark:bg-system-700 text-system-600 dark:text-system-300";
    case PrdStatus.InReview:
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    case PrdStatus.Approved:
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    case PrdStatus.Implemented:
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
    case PrdStatus.Archived:
      return "bg-system-200 dark:bg-system-600 text-system-500 dark:text-system-400";
    default:
      return "bg-system-100 dark:bg-system-700 text-system-600 dark:text-system-300";
  }
}

function formatStatusLabel(status: PrdStatus): string {
  switch (status) {
    case PrdStatus.Draft:
      return "Draft";
    case PrdStatus.InReview:
      return "In Review";
    case PrdStatus.Approved:
      return "Approved";
    case PrdStatus.Implemented:
      return "Implemented";
    case PrdStatus.Archived:
      return "Archived";
    default:
      return status;
  }
}

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

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function PRDDetailPage() {
  const { prdName } = useParams<{ prdName: string }>();
  const navigate = useNavigate();
  const { currentProject, getProjectRef } = useProject();

  const prdRef = prdName ? decodeURIComponent(prdName) : "";

  const [prd, setPrd] = useState<Prd | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<PrdDocument | null>(null);

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
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [metadataCollapsed, setMetadataCollapsed] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setShowStatusMenu(false);
      }
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleBack = () => {
    navigate("/prds");
  };

  const handleDocSelect = (doc: PrdDocument) => {
    setSelectedDoc(doc);
  };

  const handleStatusChange = async (newStatus: PrdStatus) => {
    const projectRef = getProjectRef();
    if (!projectRef || !prd) return;

    try {
      const updated = await api.prds.updatePrd({
        projectRef,
        prdRef: prd.id,
        updatePrdRequest: { status: newStatus },
      });
      setPrd(updated);
      setShowStatusMenu(false);
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

  // No project
  if (!currentProject?.localPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-system-500 dark:text-system-400">
            Project path not configured.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 text-brand-600 hover:text-brand-700 dark:text-brand-400"
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
        <div className="flex items-center gap-3 text-system-500 dark:text-system-400">
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
            className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
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
      <div className="flex-shrink-0 px-6 py-4 border-b border-system-200 dark:border-system-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-system-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to PRDs
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-system-400 dark:text-system-500 font-mono">
                {prd.displayKey}
              </span>
              <h1 className="text-xl font-semibold text-system-900 dark:text-white">
                {prd.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dropdown */}
            <div className="relative" ref={statusMenuRef}>
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${getStatusBadgeClasses(prd.status)}`}
              >
                {formatStatusLabel(prd.status)}
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1 z-50">
                  {Object.values(PrdStatus).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-system-100 dark:hover:bg-system-700 ${
                        status === prd.status
                          ? "font-medium text-brand-600 dark:text-brand-400"
                          : "text-system-700 dark:text-system-300"
                      }`}
                    >
                      {formatStatusLabel(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions menu */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="btn btn-ghost"
                title="Actions"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      handleDelete();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete PRD
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Panel (collapsible) */}
      <div className="flex-shrink-0 border-b border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-900/50">
        <button
          onClick={() => setMetadataCollapsed(!metadataCollapsed)}
          className="w-full px-6 py-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-system-400 dark:text-system-500 hover:text-system-600 dark:hover:text-system-300"
        >
          <span>Details</span>
          <svg
            className={`w-4 h-4 transition-transform ${metadataCollapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {!metadataCollapsed && (
          <div className="px-6 pb-4 grid grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-system-400 dark:text-system-500 mb-1">
                Created
              </div>
              <div className="text-sm text-system-700 dark:text-system-300">
                {formatRelativeTime(prd.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-system-400 dark:text-system-500 mb-1">
                Updated
              </div>
              <div className="text-sm text-system-700 dark:text-system-300">
                {formatRelativeTime(prd.updatedAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-system-400 dark:text-system-500 mb-1">
                Documents
              </div>
              <div className="text-sm text-system-700 dark:text-system-300">
                {prd.documents?.length ?? 0} files
              </div>
            </div>
            <div>
              <div className="text-xs text-system-400 dark:text-system-500 mb-1">
                Folder
              </div>
              <div className="text-sm text-system-700 dark:text-system-300 font-mono truncate">
                {prd.folderPath}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-900 overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-system-400 dark:text-system-500">
                Documents
              </h2>
              <button
                onClick={() => setShowAddDocModal(true)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
              >
                + Import
              </button>
            </div>
            {!prd.documents || prd.documents.length === 0 ? (
              <p className="text-sm text-system-500 dark:text-system-400">
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
                          ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                          : "text-system-600 dark:text-system-400 hover:bg-system-100 dark:hover:bg-system-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-shrink-0 ${
                            selectedDoc?.id === doc.id
                              ? "text-brand-600 dark:text-brand-400"
                              : "text-system-400 dark:text-system-500"
                          }`}
                        >
                          {getDocumentTypeIcon(doc.documentType)}
                        </span>
                        <span className="truncate flex-1">{doc.fileName}</span>
                        {doc.isPrimary && (
                          <span className="text-xs text-brand-500 dark:text-brand-400">
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
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto">
          {contentLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-system-500 dark:text-system-400">
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
                  className="mx-auto h-12 w-12 text-system-400 dark:text-system-500"
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
                <p className="mt-2 text-system-500 dark:text-system-400">
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
