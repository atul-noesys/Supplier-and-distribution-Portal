'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { MdArrowForward, MdDateRange } from 'react-icons/md';

interface TimelineLayoutProps {
  items: any[];
  size?: 'sm' | 'md' | 'lg';
  iconColor?: 'primary' | 'secondary' | 'muted' | 'accent';
  customIcon?: React.ReactNode;
  animate?: boolean;
  connectorColor?: 'primary' | 'secondary' | 'muted' | 'accent';
  className?: string;
}

export const TimelineLayout = ({
  items,
  size = 'md',
  iconColor,
  customIcon,
  animate = true,
  connectorColor,
  className,
}: TimelineLayoutProps) => {
  const sortedItems = [...items].reverse();

  return (
    <div className={`w-full space-y-4 ${className || ''}`}>
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No timeline data available</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-linear-to-b from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-600 rounded-full" />

          {/* Timeline items */}
          <div className="space-y-4">
            {sortedItems.map((item, index) => (
              <motion.div
                key={index}
                initial={animate ? { opacity: 0, x: -20 } : false}
                animate={animate ? { opacity: 1, x: 0 } : false}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: 'easeOut',
                }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 flex items-center justify-center">
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-4 border-blue-500 dark:border-blue-400 shadow-lg">
                    <MdDateRange className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>

                {/* Content Card */}
                <div className="ml-20 mb-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MdDateRange className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
                          <time className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {item.title}
                          </time>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {/* Changes Table */}
                    {item.changes && item.changes.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <colgroup>
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '75%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Field</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                                <div className="flex items-center justify-center gap-5">
                                  <span>Previous</span>
                                  <MdArrowForward className="w-5 h-5" />
                                  <span>Current</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.changes.map((change: any, changeIndex: number) => (
                              <tr
                                key={changeIndex}
                                className={`border-b border-gray-200 dark:border-gray-700 ${
                                  changeIndex % 2 === 0
                                    ? 'bg-white dark:bg-gray-800'
                                    : 'bg-gray-50 dark:bg-gray-800/50'
                                } hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors`}
                              >
                                <td className="px-4 py-3 align-top">
                                  <span className="font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md inline-block whitespace-nowrap">
                                    {change.key}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-start justify-between gap-3 text-xs">
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                        {change.oldVal === "(empty)" ? (
                                          <span className="italic text-gray-500 dark:text-gray-400">Empty</span>
                                        ) : (
                                          <span className="inline-block overflow-hidden text-ellipsis max-w-full">{change.oldVal}</span>
                                        )}
                                      </div>
                                    </div>
                                    <MdArrowForward className="mt-1 w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                        {change.newVal === "(empty)" ? (
                                          <span className="italic text-gray-500 dark:text-gray-400">Empty</span>
                                        ) : (
                                          <span className="inline-block overflow-hidden text-ellipsis max-w-full">{change.newVal}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No changes recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};