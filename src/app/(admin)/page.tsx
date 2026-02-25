"use client";

import { useStore } from "@/store/store-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import Tabs from "@/components/ui/Tabs";

// 1. Extract Iframe to a sub-component for isolation
const DashboardIframe = ({ id }: { id: string | number }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-136">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 z-10">
          <div className="animate-spin h-8 w-8 border-3 border-brand-500 border-t-transparent rounded-full" />
        </div>
      )}
      <iframe
        src={`/mobile.html?infoboardId=${id}`}
        className="w-full h-full border-0"
        title={`Mobile Dashboard ${id}`}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default function Dashboard() {
  const { nguageStore } = useStore();
  const [tab, setTab] = useState(0);

  const { data: authToken } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: Infinity, // Auth tokens don't usually change mid-session
  });

  const { data: infoboards } = useQuery({
    queryKey: ['infoboards'],
    queryFn: () => nguageStore.GetInfoboards(),
    enabled: !!authToken,
  });

  const user = useMemo(() => nguageStore.GetCurrentUserDetails(), [nguageStore]);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const tabs = useMemo(() => 
    (infoboards ?? []).map((b) => ({ label: b.name, id: b.id })), 
  [infoboards]);

  // 2. Optimized render function
  const renderPanel = useCallback((item: { id: string | number }) => {
    return <DashboardIframe key={item.id} id={item.id} />;
  }, []);

  return (
    <div className="w-full space-y-4">
      <header className="rounded-lg border border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden shadow-lg px-8 py-4">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          <span className="font-light">{timeGreeting},</span> {user?.firstName || "User"}
        </h1>
      </header>

      <Tabs
        items={tabs}
        activeIndex={tab}
        onChange={setTab}
        renderPanel={renderPanel}
      />
    </div>
  );
}