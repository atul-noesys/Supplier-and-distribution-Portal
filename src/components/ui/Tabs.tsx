"use client";

import React, { useEffect, useState } from "react";

export type TabItem = { label: string; id: string | number };

type TabsProps = {
  items: TabItem[];
  activeIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
  tabClassName?: string;
  panelClassName?: string;
  renderPanel: (item: TabItem) => React.ReactNode;
};

export default function Tabs({
  items,
  activeIndex,
  onChange,
  className = "",
  tabClassName = "",
  panelClassName = "",
  renderPanel,
}: TabsProps) {
  const isControlled = typeof activeIndex === "number";
  const [uncontrolledIndex, setUncontrolledIndex] = useState<number>(activeIndex ?? 0);

  // Derive the effective index from controlled prop or internal state
  const index = isControlled ? (activeIndex as number) : uncontrolledIndex;

  if (!items || items.length === 0) return null;

  function handleClick(i: number) {
    if (onChange) onChange(i);
    if (!isControlled) setUncontrolledIndex(i);
  }

  const active = items[index] ?? items[0];

  return (
    <div>
      <div className={`flex mt-6 ${className}`}>
        {items.map((t, i) => (
          <button
            key={t.id}
            onClick={() => handleClick(i)}
            className={`px-4 py-2 rounded-t-md font-medium border-b-2 transition-colors duration-150 ${
              i === index
                ? "border-blue-600 text-blue-700 bg-blue-50 dark:bg-gray-800"
                : "border-transparent text-gray-500 bg-gray-100 dark:bg-gray-900 hover:text-blue-600"
            } ${tabClassName}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={panelClassName}>{renderPanel(active)}</div>
    </div>
  );
}
