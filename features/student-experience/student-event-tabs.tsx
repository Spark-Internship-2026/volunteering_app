"use client";

import { useId, useState, type ReactNode } from "react";

type StudentEventTabsProps = {
  availableCount: number;
  available: ReactNode;
  upcomingCount: number;
  completedCount: number;
  upcoming: ReactNode;
  completed: ReactNode;
};

export function StudentEventTabs({
  availableCount,
  available,
  upcomingCount,
  completedCount,
  upcoming,
  completed,
}: StudentEventTabsProps) {
  const [activeTab, setActiveTab] = useState("available");
  const id = useId();
  const tabs = [
    { key: "available", label: "Available Events", count: availableCount },
    { key: "upcoming", label: "Upcoming Events", count: upcomingCount },
    { key: "completed", label: "Completed Events", count: completedCount },
  ];

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Events</h2>
      <div aria-label="My volunteering events" className="mt-4 flex overflow-x-auto border-b border-zinc-200" role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`${id}-${tab.key}-panel`}
            aria-selected={activeTab === tab.key}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeTab === tab.key ? "border-blue-700 text-blue-700" : "border-transparent text-zinc-600 hover:text-zinc-900"}`}
            id={`${id}-${tab.key}-tab`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(event) => {
              let nextIndex: number;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              } else if (event.key === "Home") {
                nextIndex = 0;
              } else if (event.key === "End") {
                nextIndex = tabs.length - 1;
              } else {
                return;
              }
              event.preventDefault();
              setActiveTab(tabs[nextIndex].key);
              document.getElementById(`${id}-${tabs[nextIndex].key}-tab`)?.focus();
            }}
            role="tab"
            tabIndex={activeTab === tab.key ? 0 : -1}
            type="button"
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          aria-labelledby={`${id}-${tab.key}-tab`}
          className="mt-4 space-y-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          hidden={activeTab !== tab.key}
          id={`${id}-${tab.key}-panel`}
          key={tab.key}
          role="tabpanel"
          tabIndex={0}
        >
          {tab.key === "available" ? available : tab.key === "upcoming" ? upcoming : completed}
        </div>
      ))}
    </div>
  );
}
