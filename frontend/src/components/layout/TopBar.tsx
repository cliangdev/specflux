import { NotificationBell, ProjectSelector } from "../ui";

export default function TopBar() {
  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          <span className="text-lg font-semibold text-white">SpecFlux</span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        <ProjectSelector />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell count={0} />
        <button className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium text-white hover:bg-gray-500 transition-colors">
          U
        </button>
      </div>
    </header>
  );
}
