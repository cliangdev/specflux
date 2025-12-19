import { useState, useEffect, useRef } from "react";
import { api, type Release } from "../../api";

interface ReleaseSelectorProps {
  projectRef?: string;
  selectedReleaseId?: string | null;
  onChange: (releaseId: string | null) => void;
  disabled?: boolean;
}

// Release icon
const ReleaseIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
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
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

export default function ReleaseSelector({
  projectRef,
  selectedReleaseId,
  onChange,
  disabled = false,
}: ReleaseSelectorProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch releases for the project
  useEffect(() => {
    const fetchReleases = async () => {
      if (!projectRef) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.releases.listReleases({ projectRef });
        setReleases(response.data ?? []);
      } catch (err) {
        console.error("Failed to fetch releases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReleases();
  }, [projectRef]);

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

  const selectedRelease = releases.find((r) => r.id === selectedReleaseId);

  const handleSelect = (release: Release | null) => {
    onChange(release?.id ?? null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors ${
          selectedRelease
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
            : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <ReleaseIcon className="w-3.5 h-3.5" />
        {selectedRelease ? (
          <span className="font-medium max-w-[100px] truncate">
            {selectedRelease.name}
          </span>
        ) : (
          <span className="italic">No release</span>
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
        <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
              Loading releases...
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-100 dark:hover:bg-surface-700 ${
                  !selectedReleaseId ? "bg-surface-100 dark:bg-surface-700" : ""
                }`}
              >
                <ReleaseIcon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <span className="text-surface-500 dark:text-surface-400 italic">
                  No release
                </span>
                {!selectedReleaseId && (
                  <svg
                    className="w-4 h-4 ml-auto text-accent-600 dark:text-accent-400 flex-shrink-0"
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
              {releases.length === 0 ? (
                <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                  No releases in this project
                </div>
              ) : (
                releases.map((release) => {
                  const isSelected = release.id === selectedReleaseId;
                  return (
                    <button
                      key={release.id}
                      type="button"
                      onClick={() => handleSelect(release)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-100 dark:hover:bg-surface-700 ${
                        isSelected ? "bg-surface-100 dark:bg-surface-700" : ""
                      }`}
                    >
                      <ReleaseIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isSelected
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-surface-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            isSelected
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-surface-900 dark:text-white"
                          }`}
                        >
                          {release.name}
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          {release.status}
                        </div>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 ml-auto text-emerald-600 dark:text-emerald-400 flex-shrink-0"
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
