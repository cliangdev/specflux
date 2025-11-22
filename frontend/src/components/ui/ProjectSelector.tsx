import { useState } from "react";

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  projects?: Project[];
  currentProject?: Project;
  onSelect?: (project: Project) => void;
}

const defaultProjects: Project[] = [{ id: "1", name: "SpecFlux" }];

export default function ProjectSelector({
  projects = defaultProjects,
  currentProject = defaultProjects[0],
  onSelect,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (project: Project) => {
    onSelect?.(project);
    setIsOpen(false);
  };

  return (
    <div className="relative">
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
          <div className="py-1">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
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
          <div className="border-t border-gray-700 py-1">
            <button className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              + New Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
