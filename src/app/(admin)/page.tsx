"use client";

import { useStore } from "@/store/store-context";
import { useMemo } from "react";

export default function Dashboard() {
  const store = useStore();

  // Get user from cached store data
  const user = useMemo(() => store.nguageStore.GetCurrentUserDetails(), [store.nguageStore]);

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
    </div>
  );
}
