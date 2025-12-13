import { useState, useEffect, useCallback } from "react";

// Inline SVG icons
const SearchIcon = ({ className }: { className?: string }) => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
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
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const GridIcon = ({ className }: { className?: string }) => (
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
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);

const ListIcon = ({ className }: { className?: string }) => (
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
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
);

export interface FilterOption {
  value: string;
  label: string;
}

export interface Filter {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface ViewOption {
  id: string;
  icon: "grid" | "list";
  label: string;
}

export interface ListPageHeaderProps {
  // Title
  title: string;

  // View toggle (optional)
  viewOptions?: ViewOption[];
  activeView?: string;
  onViewChange?: (view: string) => void;

  // Filters
  filters?: Filter[];

  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (query: string) => void;

  // Actions
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onCreate?: () => void;
  createLabel?: string;
  createIcon?: React.ReactNode;

  // Additional actions (for things like Import)
  extraActions?: React.ReactNode;

  // Results summary
  totalCount?: number;
  filteredCount?: number;
  onClearFilters?: () => void;
}

export function ListPageHeader({
  title,
  viewOptions,
  activeView,
  onViewChange,
  filters,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearch,
  onRefresh,
  isRefreshing = false,
  onCreate,
  createLabel = "Create",
  createIcon,
  extraActions,
  totalCount,
  filteredCount,
  onClearFilters,
}: ListPageHeaderProps) {
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);

  // Sync internal search value with prop
  useEffect(() => {
    setInternalSearchValue(searchValue);
  }, [searchValue]);

  // Debounce search
  useEffect(() => {
    if (!onSearch) return;

    const timeout = setTimeout(() => {
      if (internalSearchValue !== searchValue) {
        onSearch(internalSearchValue);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [internalSearchValue, searchValue, onSearch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalSearchValue(e.target.value);
    },
    []
  );

  const hasActiveFilters =
    filteredCount !== undefined &&
    totalCount !== undefined &&
    filteredCount !== totalCount;

  const getViewIcon = (icon: "grid" | "list") => {
    const iconClass = "w-4 h-4";
    return icon === "grid" ? (
      <GridIcon className={iconClass} />
    ) : (
      <ListIcon className={iconClass} />
    );
  };

  return (
    <div className="flex-shrink-0 mb-6">
      {/* Row 1: Title + Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {title}
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          {viewOptions && viewOptions.length > 0 && onViewChange && (
            <div className="flex items-center rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
              {viewOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onViewChange(option.id)}
                  className={`p-2 transition-colors ${
                    activeView === option.id
                      ? "bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white"
                      : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"
                  }`}
                  title={option.label}
                >
                  {getViewIcon(option.icon)}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          {filters &&
            filters.map((filter) => (
              <select
                key={filter.id}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="select w-auto min-w-[120px]"
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}

          {/* Search */}
          {onSearch && (
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={internalSearchValue}
                onChange={handleSearchChange}
                className="input pl-9 w-[200px]"
              />
            </div>
          )}

          {/* Extra actions (Import, etc.) */}
          {extraActions}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="btn btn-ghost p-2"
              title="Refresh"
            >
              <RefreshIcon
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          )}

          {/* Create button */}
          {onCreate && (
            <button onClick={onCreate} className="btn btn-primary">
              {createIcon || <PlusIcon className="w-4 h-4" />}
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Filter summary (only shown when filters active) */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 text-sm text-surface-500 dark:text-surface-400">
          <span>
            Showing {filteredCount} of {totalCount} items
          </span>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-accent-600 dark:text-accent-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
