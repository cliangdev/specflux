import { useState } from "react";
import { GeneralSettings } from "../components/settings/GeneralSettings";
import { RepositorySettings } from "../components/settings/RepositorySettings";
import { AgentSettings } from "../components/settings/AgentSettings";
import { SkillSettings } from "../components/settings/SkillSettings";
import { McpServerSettings } from "../components/settings/McpServerSettings";

type SettingsTab =
  | "general"
  | "repositories"
  | "agents"
  | "skills"
  | "mcp-servers";

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "repositories", label: "Repositories" },
  { id: "agents", label: "Agents" },
  { id: "skills", label: "Skills" },
  { id: "mcp-servers", label: "MCP Servers" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="h-14 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Project Settings
        </h1>
      </div>

      {/* Tab Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Navigation */}
        <div className="w-48 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600"
                    : "hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "repositories" && <RepositorySettings />}
            {activeTab === "agents" && <AgentSettings />}
            {activeTab === "skills" && <SkillSettings />}
            {activeTab === "mcp-servers" && <McpServerSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
