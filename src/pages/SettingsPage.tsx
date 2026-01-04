import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { GeneralSettings } from "../components/settings/GeneralSettings";
import { RepositorySettings } from "../components/settings/RepositorySettings";
import { PromptsSettings } from "../components/settings/PromptsSettings";
import { ClaudeItemsPage } from "../components/settings/ClaudeItemsPage";
import { ApiKeysSettings } from "../components/settings/ApiKeysSettings";
import { SyncSettings } from "../components/settings/SyncSettings";

type SettingsTab =
  | "general"
  | "repositories"
  | "sync"
  | "prompts"
  | "commands"
  | "skills"
  | "mcp"
  | "api-keys";

const VALID_TABS: SettingsTab[] = ["general", "repositories", "sync", "prompts", "commands", "skills", "mcp", "api-keys"];

interface TabGroup {
  label: string;
  tabs: { id: SettingsTab; label: string }[];
}

const tabGroups: TabGroup[] = [
  {
    label: "Project",
    tabs: [
      { id: "general", label: "General" },
      { id: "repositories", label: "Repositories" },
      { id: "sync", label: "Sync" },
    ],
  },
  {
    label: "Claude Code",
    tabs: [
      { id: "prompts", label: "Prompts" },
      { id: "commands", label: "Commands" },
      { id: "skills", label: "Skills" },
      { id: "mcp", label: "MCP Servers" },
    ],
  },
  {
    label: "Account",
    tabs: [
      { id: "api-keys", label: "API Keys" },
    ],
  },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && VALID_TABS.includes(tabParam as SettingsTab)
    ? (tabParam as SettingsTab)
    : "general";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab state with URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && VALID_TABS.includes(tabParam as SettingsTab)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="h-14 border-b border-surface-200 dark:border-surface-700 flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold text-surface-900 dark:text-white">
          Project Settings
        </h1>
      </div>

      {/* Tab Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Navigation - Sidebar */}
        <div className="w-52 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 overflow-y-auto">
          {tabGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? "mt-6" : ""}>
              <div className="px-3 py-1 text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                {group.label}
              </div>
              <div className="mt-1 space-y-1">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        activeTab === tab.id
                          ? "bg-white dark:bg-surface-800 shadow-sm text-accent-600 dark:text-accent-400 ring-1 ring-surface-200 dark:ring-surface-700"
                          : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-8 bg-white dark:bg-surface-900">
          <div className="max-w-3xl">
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "repositories" && <RepositorySettings />}
            {activeTab === "sync" && <SyncSettings />}
            {activeTab === "prompts" && <PromptsSettings />}
            {activeTab === "commands" && <ClaudeItemsPage category="command" />}
            {activeTab === "skills" && <ClaudeItemsPage category="skill" />}
            {activeTab === "mcp" && <ClaudeItemsPage category="mcp" />}
            {activeTab === "api-keys" && <ApiKeysSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
