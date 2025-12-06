import { ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onChange,
}: TabNavigationProps) {
  return (
    <div className="flex border-b border-system-200 dark:border-system-700">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-system-200 hover:border-system-300 dark:hover:border-system-600"
            }`}
          >
            {tab.icon && (
              <span className={isActive ? "text-brand-500" : "text-system-400"}>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
