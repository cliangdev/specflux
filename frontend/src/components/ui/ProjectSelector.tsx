import { useState, useRef, useEffect } from "react";
import { useProject } from "../../contexts";
import ProjectCreateModal from "./ProjectCreateModal";

export default function ProjectSelector() {
  const {
    projects,
    currentProject,
    loading,
    error,
    selectProject,
    refreshProjects,
  } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Error loading
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
      >
        <span>{currentProject?.name || "Select Project"}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
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

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          {projects.length > 0 ? (
            <div className="py-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    selectProject(project);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                    project.id === currentProject?.id
                      ? "text-indigo-400"
                      : "text-gray-300"
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400">
              No projects yet
            </div>
          )}
          <div className="border-t border-gray-700 py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              + New Project
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <ProjectCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={refreshProjects}
        />
      )}
    </div>
  );
}
