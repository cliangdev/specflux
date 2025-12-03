import { useState, useEffect, useRef } from "react";
import type { Epic } from "../../api/generated";
import { api } from "../../api";
import { v2Api } from "../../api/v2/client";

// Unified epic type for the selector
interface EpicOption {
  id: string | number;
  title: string;
  status: string;
}

interface EpicSelectorProps {
  projectId: number;
  /** v2 project reference (projectKey or id) */
  projectRef?: string;
  selectedEpicId?: number | string | null;
  onChange: (epicId: number | string | null) => void;
  disabled?: boolean;
}

// Epic icon
const EpicIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

export default function EpicSelector({
  projectId,
  projectRef,
  selectedEpicId,
  onChange,
  disabled = false,
}: EpicSelectorProps) {
  const [epics, setEpics] = useState<EpicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch epics for the project
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        setLoading(true);
        if (projectRef) {
          // Use v2 API
          const response = await v2Api.epics.listEpics({ projectRef });
          const v2Epics = response.data ?? [];
          // Map v2 status to lowercase
          const statusMap: Record<string, string> = {
            PLANNING: "planning",
            IN_PROGRESS: "active",
            COMPLETED: "completed",
          };
          setEpics(
            v2Epics.map((e) => ({
              id: e.id,
              title: e.title,
              status: statusMap[e.status] || "planning",
            })),
          );
        } else {
          // Fallback to v1 API for local-only mode
          const response = await api.epics.listEpics({ id: projectId });
          setEpics(
            (response.data ?? []).map((e) => ({
              id: e.id,
              title: e.title,
              status: e.status,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch epics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEpics();
  }, [projectId, projectRef]);

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

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);

  const handleSelect = (epic: EpicOption | null) => {
    onChange(epic?.id ?? null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors ${
          selectedEpic
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
            : "bg-system-100 text-system-600 dark:bg-system-800 dark:text-system-400 hover:bg-system-200 dark:hover:bg-system-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <EpicIcon className="w-3.5 h-3.5" />
        {selectedEpic ? (
          <span className="font-medium max-w-[150px] truncate">
            {selectedEpic.title}
          </span>
        ) : (
          <span className="italic">No epic</span>
        )}
        <svg
          className="w-3.5 h-3.5 ml-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-system-500 dark:text-system-400">
              Loading epics...
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                  !selectedEpicId ? "bg-system-100 dark:bg-system-700" : ""
                }`}
              >
                <EpicIcon className="w-4 h-4 text-system-400 flex-shrink-0" />
                <span className="text-system-500 dark:text-system-400 italic">
                  No epic
                </span>
                {!selectedEpicId && (
                  <svg
                    className="w-4 h-4 ml-auto text-brand-600 dark:text-brand-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              {epics.length === 0 ? (
                <div className="px-3 py-2 text-sm text-system-500 dark:text-system-400">
                  No epics in this project
                </div>
              ) : (
                epics.map((epic) => {
                  const isSelected = epic.id === selectedEpicId;
                  return (
                    <button
                      key={epic.id}
                      type="button"
                      onClick={() => handleSelect(epic)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                        isSelected ? "bg-system-100 dark:bg-system-700" : ""
                      }`}
                    >
                      <EpicIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isSelected
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-system-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            isSelected
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-system-900 dark:text-white"
                          }`}
                        >
                          {epic.title}
                        </div>
                        <div className="text-xs text-system-500 dark:text-system-400">
                          {epic.status}
                        </div>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 ml-auto text-purple-600 dark:text-purple-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
