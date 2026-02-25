"use client";

import { useStore } from "@/store/store-context";
import { useQuery } from "@tanstack/react-query";

import { useState, useMemo, useEffect } from "react";
import Tabs from "@/components/ui/Tabs";

export default function Dashboard() {
  const { nguageStore } = useStore();
    // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Get user from cached store data
  const user = useMemo(() => nguageStore.GetCurrentUserDetails(), [nguageStore]);

  // Get time-based greeting
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  }, []);

  // Tab state: 0 for id 3, 1 for id 4
  const [tab, setTab] = useState(0);
  // Iframe loading indicator
  const [iframeLoading, setIframeLoading] = useState(true);

  // Reset iframe loading state when active tab changes
  useEffect(() => {
    setIframeLoading(true);
  }, [tab]);

  // Fetch infoboards using TanStack Query
  const { data: infoboards, isLoading: isInfoboardsLoading, error: infoboardsError } = useQuery({
    queryKey: ['infoboards'],
    queryFn: () => nguageStore.GetInfoboards(),
    staleTime: 0,
    enabled: !!authToken,
  });

  // Tabs from infoboards API
  const tabs = (infoboards ?? []).map((b) => ({ label: b.name, id: b.id }));

  return (
    <div className="w-full">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden shadow-lg">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                <span className="text-gray-800 font-semibold">{timeGreeting},</span> {user?.firstName || "User"}
              </h1>
            </div>
          </div>
        </div>
      </div>
      <Tabs
        items={tabs}
        activeIndex={tab}
        onChange={setTab}
        renderPanel={(item) => (
          <div className="relative">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 z-10">
                <div className="animate-spin">
                  <div className="h-8 w-8 border-3 border-brand-500 border-t-transparent rounded-full"></div>
                </div>
              </div>
            )}

            <iframe
              key={item.id}
              src={`/mobile.html?infoboardId=${item.id}`}
              className="w-full border-0 h-136"
              title={`Mobile Dashboard ${item.id}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        )}
      />
    </div>
  );
}
