import { useState, useEffect, useRef } from "react";
import { api, type Prd } from "../../api";

interface PrdSelectorProps {
  projectRef?: string;
  selectedPrdId?: string | null;
  onChange: (prdId: string | null) => void;
  disabled?: boolean;
}

// Document icon for PRD
const PrdIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
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
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default function PrdSelector({
  projectRef,
  selectedPrdId,
  onChange,
  disabled = false,
}: PrdSelectorProps) {
  const [prds, setPrds] = useState<Prd[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch PRDs for the project
  useEffect(() => {
    const fetchPrds = async () => {
      if (!projectRef) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.prds.listPrds({ projectRef, limit: 100 });
        setPrds(response.data ?? []);
      } catch (err) {
        console.error("Failed to fetch PRDs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrds();
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

  const selectedPrd = prds.find((p) => p.id === selectedPrdId);

  const handleSelect = (prd: Prd | null) => {
    onChange(prd?.id ?? null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors ${
          selectedPrd
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <PrdIcon className="w-3.5 h-3.5" />
        {selectedPrd ? (
          <span className="font-medium max-w-[120px] truncate">
            {selectedPrd.displayKey}
          </span>
        ) : (
          <span className="italic">No PRD</span>
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
        <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
              Loading PRDs...
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-100 dark:hover:bg-surface-700 ${
                  !selectedPrdId ? "bg-surface-100 dark:bg-surface-700" : ""
                }`}
              >
                <PrdIcon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <span className="text-surface-500 dark:text-surface-400 italic">
                  No PRD
                </span>
                {!selectedPrdId && (
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
              {prds.length === 0 ? (
                <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                  No PRDs in this project
                </div>
              ) : (
                prds.map((prd) => {
                  const isSelected = prd.id === selectedPrdId;
                  return (
                    <button
                      key={prd.id}
                      type="button"
                      onClick={() => handleSelect(prd)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-100 dark:hover:bg-surface-700 ${
                        isSelected ? "bg-surface-100 dark:bg-surface-700" : ""
                      }`}
                    >
                      <PrdIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isSelected
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-surface-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500 dark:text-surface-400">
                            {prd.displayKey}
                          </span>
                          <span
                            className={`truncate ${
                              isSelected
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-surface-900 dark:text-white"
                            }`}
                          >
                            {prd.title}
                          </span>
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          {prd.status}
                        </div>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400 flex-shrink-0"
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
