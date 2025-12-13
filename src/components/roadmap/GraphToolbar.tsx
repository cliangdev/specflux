import { useReactFlow } from "reactflow";

/**
 * Custom toolbar for the epic graph with zoom controls and fit-to-screen.
 * Displays current zoom level and provides quick actions.
 */
export default function GraphToolbar() {
  const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 300 });
  };

  const handleResetZoom = () => {
    const { x, y } = getViewport();
    setViewport({ x, y, zoom: 1 }, { duration: 200 });
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      {/* Zoom controls */}
      <div className="flex items-center bg-white dark:bg-surface-800 rounded-lg shadow border border-surface-200 dark:border-surface-700">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-l-lg transition-colors"
          title="Zoom out"
        >
          <svg
            className="w-4 h-4 text-surface-600 dark:text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-1 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 border-x border-surface-200 dark:border-surface-700 transition-colors"
          title="Reset to 100%"
        >
          100%
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-r-lg transition-colors"
          title="Zoom in"
        >
          <svg
            className="w-4 h-4 text-surface-600 dark:text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Fit to screen button */}
      <button
        onClick={handleFitView}
        className="p-2 bg-white dark:bg-surface-800 rounded-lg shadow border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
        title="Fit to screen"
      >
        <svg
          className="w-4 h-4 text-surface-600 dark:text-surface-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  );
}
