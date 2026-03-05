'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { LocationData } from '@/utils/csvParser';

// Add pulse animation styles
const pulseStyles = `
  @keyframes warehouse-pulse {
    0%, 100% {
      filter: drop-shadow(0 0 0 rgba(59, 130, 246, 0));
    }
    50% {
      filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.9)) drop-shadow(0 0 20px rgba(37, 99, 235, 0.6));
    }
  }
  
  .warehouse-pulse {
    animation: warehouse-pulse 2s ease-in-out infinite;
  }

  @keyframes cell-hover {
    0% {
      filter: brightness(1);
    }
    100% {
      filter: brightness(1.1);
    }
  }

  .warehouse-cell-hover:hover {
    animation: cell-hover 0.2s ease-in-out forwards;
  }

  .warehouse-skeleton {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .warehouse-cell-selected {
    filter: drop-shadow(0 4px 8px rgba(30, 64, 175, 0.3));
  }

  .toggle-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .toggle-switch input {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 44px;
    height: 20px;
    background-color: #cbd5e1;
    border-radius: 10px;
    transition: background-color 0.3s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toggle-slider:before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: 2px;
    transition: left 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle-switch input:checked + .toggle-slider:before {
    left: 26px;
  }

  .toggle-label {
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    user-select: none;
  }
`;

interface WarehouseVisualizationProps {
  locations: LocationData[];
  selectedLocation?: string;
  onLocationClick?: (locationCode: string) => void;
}

interface GridCell {
  row: number;
  bay: number;
  level: number;
  locationCode: string;
  isSelected: boolean;
  zoneData: LocationData;
}

export const WarehouseVisualization: React.FC<WarehouseVisualizationProps> = ({
  locations,
  selectedLocation,
  onLocationClick,
}) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const topHeaderRef = useRef<HTMLDivElement>(null);
  const leftHeaderRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(true);

  const cellWidth = 60;
  const cellHeight = 52;
  const headerSize = 40;
  const cellStartX = headerSize; // Start right after left header
  const cellStartY = headerSize; // Start right after top header

  // Helper function to calculate visual position accounting for sub-paths and main paths
  const getVisualPosition = (dataPosition: number, blockSize: number) => {
    // blockSize: 5 for rows, 6 for bays
    // Pattern: data1, subpath, data2, subpath, ..., dataBlockSize, mainpath
    // Each data item uses 2 visual positions (item + subpath), last data item is followed by mainpath
    const group = Math.ceil(dataPosition / blockSize);
    const posInGroup = ((dataPosition - 1) % blockSize) + 1;
    const blockLength = blockSize * 2; // blockSize data items * 2 (with subpaths, last one gets mainpath)
    return (group - 1) * blockLength + (posInGroup * 2 - 1);
  };

  // Helper function to check if a visual position is a sub-path
  const isSubPathPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize * 2;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    // Sub-paths are at even positions (2, 4, 6, 8, 10, ...) within the block
    // but not the last position (which is the mainpath)
    return posInBlock % 2 === 0 && posInBlock !== blockLength;
  };

  // Helper function to check if a visual position is a main path
  const isMainPathPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize * 2;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    return posInBlock === blockLength;
  };

  // Helper function to check if a visual position is reserved for any path (visible or hidden)
  const isPathReservedPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize * 2;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    // All even positions are subpaths (including the last subpath), and the last position is main path
    return posInBlock % 2 === 0 || posInBlock === blockLength;
  };

  // Helper function to get the data position (label number) from visual position
  const getDataPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize * 2;
    const group = Math.floor((visualPos - 1) / blockLength) + 1;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    // posInBlock must be odd (1, 3, 5, 7, 9, ...)
    // Convert to posInGroup: 1→1, 3→2, 5→3, 7→4, 9→5
    const posInGroup = Math.ceil(posInBlock / 2);
    return (group - 1) * blockSize + posInGroup;
  };

  const gridData = useMemo(() => {
    // Group locations by row and bay
    const grid = new Map<string, GridCell[]>();

    locations.forEach((loc) => {
      const row = parseInt(loc['RowNumber*'] || '0');
      const bay = parseInt(loc.BayNumber || '0');
      const level = parseInt(loc['LevelNumber*'] || '0');

      if (row > 0 && bay > 0 && level > 0) {
        // Calculate visual positions accounting for path rows/bays
        const visualRow = getVisualPosition(row, 5); // 5 cells per block before path
        const visualBay = getVisualPosition(bay, 6); // 6 cells per block before path
        const gridKey = `${visualRow}-${visualBay}`;
        
        if (!grid.has(gridKey)) {
          grid.set(gridKey, []);
        }

        grid.get(gridKey)!.push({
          row: visualRow,
          bay: visualBay,
          level,
          locationCode: loc.LocationCode,
          isSelected: loc.LocationCode === selectedLocation,
          zoneData: loc,
        });
      }
    });

    return Array.from(grid.entries()).map(([key, cells]) => ({
      gridKey: key,
      cells: cells.sort((a, b) => a.level - b.level),
    }));
  }, [locations, selectedLocation]);

  const maxRow = useMemo(
    () => Math.max(...gridData.flatMap((g) => g.cells.map(c => c.row)), 1),
    [gridData]
  );
  
  const maxBay = useMemo(
    () => Math.max(...gridData.flatMap((g) => g.cells.map((c) => c.bay)), 1),
    [gridData]
  );
  const maxLevel = useMemo(
    () => Math.max(...gridData.flatMap((g) => g.cells.map((c) => c.level)), 1),
    [gridData]
  );

  const svgWidth = cellStartX + maxBay * cellWidth;
  const svgHeight = cellStartY + maxRow * cellHeight;

  // Sync scroll positions between headers and main content
  useEffect(() => {
    const mainScroll = mainScrollRef.current;
    if (!mainScroll) return;

    const handleScroll = () => {
      if (topHeaderRef.current) {
        topHeaderRef.current.scrollLeft = mainScroll.scrollLeft;
      }
      if (leftHeaderRef.current) {
        leftHeaderRef.current.scrollTop = mainScroll.scrollTop;
      }
    };

    mainScroll.addEventListener('scroll', handleScroll);
    return () => mainScroll.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll and animate to selected location
  useEffect(() => {
    if (!selectedLocation || !mainScrollRef.current) return;

    // Find the selected cell's position in the grid
    const selectedCell = gridData
      .flatMap((gridItem) => gridItem.cells)
      .find((cell) => cell.locationCode === selectedLocation);

    if (selectedCell) {
      const cellX = cellStartX + (selectedCell.bay - 1) * cellWidth;
      const cellY = cellStartY + (selectedCell.row - 1) * cellHeight;

      // Get the container dimensions
      const container = mainScrollRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate maximum scroll values to prevent overshooting
      const maxScrollLeft = Math.max(0, svgWidth - containerWidth);
      const maxScrollTop = Math.max(0, svgHeight - containerHeight);
      
      // Calculate desired scroll position and clamp it
      let scrollLeft = cellX - 60; // Offset to center it in view
      let scrollTop = cellY - 60;
      
      scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft));
      scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));

      // Smooth scroll to the cell position
      mainScrollRef.current.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }, [selectedLocation, gridData, cellWidth, cellHeight, cellStartX, cellStartY, svgWidth, svgHeight]);

  return (
    <div className="w-full">
      <style>{pulseStyles}</style>
      <div className="mb-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-gray-800">
            Warehouse Layout (2D View)
          </h3>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={() => setShowLegend(!showLegend)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Legend</span>
          </label>
        </div>
      </div>

      {/* Grid container with fixed headers */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden h-112 relative shadow-sm">
        {/* Main scrollable content */}
        <div
          ref={mainScrollRef}
          className="w-full h-full overflow-auto"
          style={{
            paddingTop: `${headerSize}px`,
            paddingLeft: `${headerSize}px`,
            backgroundColor: '#fafbfc',
            scrollbarGutter: 'stable',
          }}
        >
          <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
            <defs>
            </defs>

            {/* Background */}
            <rect width={svgWidth} height={svgHeight} fill="#fafbfc" />

            {/* Grid lines - only for data cell positions (not path-reserved) */}
            {/* Vertical grid lines */}
            {Array.from({ length: maxBay + 1 }).map((_, i) => {
              // Draw vertical lines only at data bay boundaries
              if (i === 0 || i === maxBay) {
                return (
                  <line
                    key={`vline-${i}`}
                    x1={cellStartX + i * cellWidth}
                    y1={cellStartY}
                    x2={cellStartX + i * cellWidth}
                    y2={cellStartY + maxRow * cellHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                );
              }
              // For intermediate lines, only draw where not interrupted by path positions
              const bay = i;
              if (!isPathReservedPosition(bay, 6)) {
                return (
                  <line
                    key={`vline-${i}`}
                    x1={cellStartX + i * cellWidth}
                    y1={cellStartY}
                    x2={cellStartX + i * cellWidth}
                    y2={cellStartY + maxRow * cellHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                );
              }
              return null;
            })}
            {/* Horizontal grid lines */}
            {Array.from({ length: maxRow + 1 }).map((_, i) => {
              // Draw horizontal lines only at data row boundaries
              if (i === 0 || i === maxRow) {
                return (
                  <line
                    key={`hline-${i}`}
                    x1={cellStartX}
                    y1={cellStartY + i * cellHeight}
                    x2={cellStartX + maxBay * cellWidth}
                    y2={cellStartY + i * cellHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                );
              }
              // For intermediate lines, only draw where not interrupted by path positions
              const row = i;
              if (!isPathReservedPosition(row, 5)) {
                return (
                  <line
                    key={`hline-${i}`}
                    x1={cellStartX}
                    y1={cellStartY + i * cellHeight}
                    x2={cellStartX + maxBay * cellWidth}
                    y2={cellStartY + i * cellHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                );
              }
              return null;
            })}

            {/* Sub-path cells and main path cells - render first so location cells appear on top */}
            {/* Horizontal sub-path rows */}
            {Array.from({ length: maxRow }).map((_, rowIdx) => {
              const row = rowIdx + 1;
              if (isSubPathPosition(row, 5)) {
                const y = cellStartY + (row - 1) * cellHeight;
                return (
                  <g key={`subpath-row-${row}`} pointerEvents="none">
                    {/* Background - fully opaque white so overlapping subpaths appear seamless */}
                    <rect
                      x={cellStartX}
                      y={y}
                      width={maxBay * cellWidth}
                      height={cellHeight}
                      fill="#ffffff"
                      opacity={1}
                    />
                  </g>
                );
              }
              return null;
            })}

            {/* Horizontal sub-path rows - white background only */}
            
            {/* Intersection coverage - white rectangles where horizontal and vertical subpaths cross */}
            {Array.from({ length: maxRow }).map((_, rIdx) => {
              const row = rIdx + 1;
              if (isSubPathPosition(row, 5)) {
                return Array.from({ length: maxBay }).map((_, bIdx) => {
                  const bay = bIdx + 1;
                  if (isSubPathPosition(bay, 6)) {
                    const x = cellStartX + (bay - 1) * cellWidth;
                    const y = cellStartY + (row - 1) * cellHeight;
                    return (
                      <rect
                        key={`intersection-${row}-${bay}`}
                        x={x}
                        y={y}
                        width={cellWidth}
                        height={cellHeight}
                        fill="#ffffff"
                        opacity={1}
                        pointerEvents="none"
                      />
                    );
                  }
                  return null;
                });
              }
              return null;
            })}

            {/* Vertical sub-path bays */}
            {Array.from({ length: maxBay }).map((_, bayIdx) => {
              const bay = bayIdx + 1;
              if (isSubPathPosition(bay, 6)) {
                const x = cellStartX + (bay - 1) * cellWidth;
                return (
                  <g key={`subpath-bay-${bay}`} pointerEvents="none">
                    {/* Background - fully opaque white so overlapping subpaths appear seamless */}
                    <rect
                      x={x}
                      y={cellStartY}
                      width={cellWidth}
                      height={maxRow * cellHeight}
                      fill="#ffffff"
                      opacity={1}
                    />
                  </g>
                );
              }
              return null;
            })}

            {/* Draw thin cell boxes for DATA positions so empty boxes remain visible when sub-paths overlap */}
            {Array.from({ length: maxRow }).map((_, rIdx) => {
              const row = rIdx + 1;
              return Array.from({ length: maxBay }).map((_, bIdx) => {
                const bay = bIdx + 1;
                // Only draw boxes for actual data positions (not path-reserved positions)
                if (!isPathReservedPosition(row, 5) && !isPathReservedPosition(bay, 6)) {
                  const x = cellStartX + (bay - 1) * cellWidth;
                  const y = cellStartY + (row - 1) * cellHeight;
                  return (
                    <rect
                      key={`empty-box-${row}-${bay}`}
                      x={x}
                      y={y}
                      width={cellWidth}
                      height={cellHeight}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      pointerEvents="none"
                    />
                  );
                }
                return null;
              });
            })}

            {/* Warehouse cells grouped by level */}
            {gridData.map((gridItem) => {
              const [rowStr, bayStr] = gridItem.gridKey.split('-');
              const row = parseInt(rowStr);
              const bay = parseInt(bayStr);

              return gridItem.cells.map((cell) => {
                const x = cellStartX + (bay - 1) * cellWidth;
                const y = cellStartY + (row - 1) * cellHeight;
                const isSelected = cell.isSelected;

                return (
                  <g key={`cell-${cell.locationCode}`}>
                    {/* Shadow for selected cell */}
                    {isSelected && (
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={cellWidth + 4}
                        height={cellHeight + 4}
                        fill="none"
                        stroke="#1e40af"
                        strokeWidth="2"
                        rx="4"
                        opacity="0.2"
                      />
                    )}

                    {/* Cell rectangle */}
                    <rect
                      x={x}
                      y={y}
                      width={cellWidth}
                      height={cellHeight}
                      fill={isSelected ? '#2563eb' : '#6b7280'}
                      stroke={isSelected ? '#1e40af' : '#000000'}
                      strokeWidth={isSelected ? '2' : '2'}
                      rx="4"
                      className={`warehouse-skeleton ${isSelected ? 'warehouse-pulse warehouse-cell-selected' : 'warehouse-cell-hover'}`}
                      onClick={() => onLocationClick?.(cell.locationCode)}
                      style={{
                        filter: isSelected ? undefined : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))',
                      }}
                    />

                    {/* Location code - small font on all cells */}
                    <text
                      x={x + cellWidth / 2}
                      y={y + 8}
                      fontSize="7"
                      fontWeight="bold"
                      fill={isSelected ? '#dbeafe' : '#1e293b'}
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {cell.locationCode}
                    </text>

                    {/* Level indicator - centered when selected, bottom when not */}
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight - 6}
                      fontSize={isSelected ? "10" : "8"}
                      fill={isSelected ? '#dbeafe' : '#64748b'}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight={isSelected ? "700" : "500"}
                      pointerEvents="none"
                    >
                      L{cell.level}
                    </text>

                    {/* Location code on hover - tooltip */}
                    <title>{`${cell.locationCode} (Row ${getDataPosition(cell.row, 5)}, Bay ${getDataPosition(cell.bay, 6)}, Level ${cell.level})`}</title>
                  </g>
                );
              });
            })}

            {/* Horizontal main path rows - rendered last for proper z-index */}
            {Array.from({ length: maxRow }).map((_, rowIdx) => {
              const row = rowIdx + 1;
              if (isMainPathPosition(row, 5)) {
                const y = cellStartY + (row - 1) * cellHeight;
                // Calculate horizontal path index (1, 2, 3, ...)
                const pathIndex = Math.floor((row - 1) / 11) + 1;
                return (
                  <g key={`path-row-${row}`}>
                    {/* Background */}
                    <rect
                      x={cellStartX}
                      y={y}
                      width={maxBay * cellWidth}
                      height={cellHeight}
                      fill="#000000"
                      opacity="0.7"
                    />
                    {/* Center dashed line */}
                    <line
                      x1={cellStartX}
                      y1={y + cellHeight / 2}
                      x2={cellStartX + maxBay * cellWidth}
                      y2={y + cellHeight / 2}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                    {/* Path number label */}
                    <text
                      x={cellStartX + cellWidth / 2}
                      y={y + 12}
                      fontSize="14"
                      fontWeight="bold"
                      fill="#ffffff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      H{pathIndex}
                    </text>
                    {/* Border */}
                    <rect
                      x={cellStartX}
                      y={y}
                      width={maxBay * cellWidth}
                      height={cellHeight}
                      fill="none"
                      stroke="#1a1a1a"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              }
              return null;
            })}

            {/* Vertical main path bays - rendered last for proper z-index */}
            {Array.from({ length: maxBay }).map((_, bayIdx) => {
              const bay = bayIdx + 1;
              if (isMainPathPosition(bay, 6)) {
                const x = cellStartX + (bay - 1) * cellWidth;
                // Calculate vertical path index (1, 2, 3, ...)
                const pathIndex = Math.floor((bay - 1) / 13) + 1;
                return (
                  <g key={`path-bay-${bay}`}>
                    {/* Background */}
                    <rect
                      x={x}
                      y={cellStartY}
                      width={cellWidth}
                      height={maxRow * cellHeight}
                      fill="#000000"
                      opacity="0.7"
                    />
                    {/* Center dashed line */}
                    <line
                      x1={x + cellWidth / 2}
                      y1={cellStartY}
                      x2={x + cellWidth / 2}
                      y2={cellStartY + maxRow * cellHeight}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                    {/* Path number label */}
                    <text
                      x={x + cellWidth / 2 + 8} 
                      y={cellStartY + 12}
                      fontSize="14"
                      fontWeight="bold"
                      fill="#ffffff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      V{pathIndex}
                    </text>
                    {/* Border */}
                    <rect
                      x={x}
                      y={cellStartY}
                      width={cellWidth}
                      height={maxRow * cellHeight}
                      fill="none"
                      stroke="#1a1a1a"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Sticky Legend - Top Right */}
        {showLegend && (
          <div
            className="absolute top-12 right-4 bg-white border border-slate-200 rounded-lg py-1.5 px-2 shadow-md z-30"
            style={{
              width: '105px',
            }}
          >
            {/* Empty cell legend */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 border rounded"
                style={{ backgroundColor: '#6b7280', borderColor: '#000000' }}
              />
              <span className="text-xs font-medium text-slate-700">Empty</span>
            </div>

            {/* Selected cell legend */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 border border-blue-900 rounded"
                style={{ backgroundColor: '#2563eb' }}
              />
              <span className="text-xs font-medium text-slate-700">Selected</span>
            </div>

            {/* Sub-path legend */}
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="8" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="14" height="8" fill="#ffffff" opacity="0.4" />
              </svg>
              <span className="text-xs font-medium text-slate-700">Sub-path</span>
            </div>

            {/* Main path legend */}
            <div className="flex items-center gap-2">
              <svg width="14" height="8" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="14" height="8" fill="#000000" opacity="0.7" />
                <line x1="1" y1="4" x2="13" y2="4" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3,2" />
              </svg>
              <span className="text-xs font-medium text-slate-700">Path</span>
            </div>
          </div>
        )}

        {/* Fixed Top Header - Bay labels */}
        <div
          ref={topHeaderRef}
          className="absolute top-0 left-0 right-0 bg-linear-to-b from-slate-100 to-slate-50 border-b border-slate-200"
          style={{
            left: `${headerSize}px`,
            height: `${headerSize}px`,
            overflow: 'hidden',
            zIndex: 10,
            paddingRight: '16px',
          }}
        >
          <svg width={svgWidth} height={headerSize} xmlns="http://www.w3.org/2000/svg">
            <rect width={svgWidth} height={headerSize} fill="none" />
            {/* Axis labels - Bay numbers (top) */}
            {Array.from({ length: maxBay }).map((_, i) => {
              const visualPos = i + 1;
              // Only show labels for data bays (not path-reserved positions)
              if (!isPathReservedPosition(visualPos, 6)) {
                const dataPos = getDataPosition(visualPos, 6);
                return (
                  <text
                    key={`bay-label-${i}`}
                    x={cellStartX + i * cellWidth + cellWidth / 2}
                    y={headerSize - 10}
                    fontSize="12"
                    fill="#475569"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    B{dataPos}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Fixed Left Header - Row numbers */}
        <div
          ref={leftHeaderRef}
          className="absolute top-0 left-0 bg-gradient-to-r from-slate-100 to-slate-50 border-r border-slate-200"
          style={{
            top: `${headerSize}px`,
            width: `${headerSize}px`,
            height: `calc(100% - ${headerSize}px)`,
            overflow: 'hidden',
            zIndex: 10,
            paddingBottom: '16px',
          }}
        >
          <svg width={headerSize} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
            <rect width={headerSize} height={svgHeight} fill="none" />
            {/* Axis labels - Row numbers (left side) */}
            {Array.from({ length: maxRow }).map((_, i) => {
              const visualPos = i + 1;
              // Only show labels for data rows (not path-reserved positions)
              if (!isPathReservedPosition(visualPos, 5)) {
                const dataPos = getDataPosition(visualPos, 5);
                return (
                  <text
                    key={`row-label-${i}`}
                    x={headerSize / 2}
                    y={cellStartY + i * cellHeight + cellHeight / 2}
                    fontSize="12"
                    fill="#475569"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight="700"
                  >
                    R{dataPos}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Top-left corner - empty cell */}
        <div
          className="absolute top-0 left-0 bg-gradient-to-br from-slate-100 to-slate-50 border-b border-r border-slate-200"
          style={{
            width: `${headerSize}px`,
            height: `${headerSize}px`,
            zIndex: 20,
          }}
        />
      </div>
    </div>
  );
};
