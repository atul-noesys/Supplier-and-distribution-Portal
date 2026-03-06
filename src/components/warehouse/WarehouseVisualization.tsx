'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { LocationData, ItemData } from '@/utils/csvParser';
import { Loader, X } from 'lucide-react';
import Badge from '@/components/ui/badge/Badge';
import { useStore } from '@/store/store-context';
import { useQuery } from '@tanstack/react-query';

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

const getStatusColor = (
  status: string | number | null | undefined,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = String(status || "").toLowerCase();
  switch (lowerStatus) {
    case "completed":
    case "delivered":
    case "approved":
    case "ready to ship":
      return "success";
    case "pending":
    case "work in progress":
      return "warning";
    case "shipped":
    case "production":
    case "in shipment":
      return "info";
    case "in warehouse":
      return "primary";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

interface WarehouseVisualizationProps {
  locations: LocationData[];
  selectedLocation?: string;
  selectedItem?: ItemData | null;
  items?: ItemData[];
  onLocationClick?: (locationCode: string) => void;
  isLoading?: boolean;
}

interface GridCell {
  row: number;
  bay: number;
  level: number;
  locationCode: string;
  isSelected: boolean;
  zoneData: LocationData;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  item?: ItemData;
  location?: LocationData;
  level?: number;
  locationCode?: string;
}

export const WarehouseVisualization: React.FC<WarehouseVisualizationProps> = ({
  locations,
  selectedLocation,
  selectedItem,
  items,
  onLocationClick,
  isLoading,
}) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const topHeaderRef = useRef<HTMLDivElement>(null);
  const leftHeaderRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Viewport state for virtualization
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 800, height: 600 });
  const rafRef = useRef<number | null>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });

  const cellWidth = 80;
  // Increased cell height to give more vertical room for stacked levels
  const cellHeight = 128;
  const headerSize = 40;
  // Increased sizes to better display stacked levels
  // `cellWidth`: horizontal size per bay; `cellHeight`: vertical size per row
  const cellStartX = headerSize; // Start right after left header
  const cellStartY = headerSize; // Start right after top header

  // Helper function to calculate visual position accounting for main paths only (sub-path gaps removed)
  // New pattern per block: data1, data2, ..., dataBlockSize, mainpath
  // blockLength = blockSize (data) + 1 (main path)
  const getVisualPosition = (dataPosition: number, blockSize: number) => {
    const group = Math.ceil(dataPosition / blockSize);
    const posInGroup = ((dataPosition - 1) % blockSize) + 1;
    const blockLength = blockSize + 1; // data items plus one main path slot
    return (group - 1) * blockLength + posInGroup;
  };

  // Helper function to check if a visual position is a main path
  const isMainPathPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize + 1;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    return posInBlock === blockLength;
  };

  // Helper function to check if a visual position is reserved for any path (only main paths now)
  const isPathReservedPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize + 1;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    return posInBlock === blockLength;
  };

  // Helper function to get the data position (label number) from visual position
  const getDataPosition = (visualPos: number, blockSize: number) => {
    const blockLength = blockSize + 1;
    const group = Math.floor((visualPos - 1) / blockLength) + 1;
    const posInBlock = ((visualPos - 1) % blockLength) + 1;
    // If this is the main path slot, return the last data index in the previous group
    if (posInBlock === blockLength) {
      return group * blockSize; // main path corresponds after group data
    }
    const posInGroup = posInBlock; // 1..blockSize
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
        const visualRow = getVisualPosition(row, 2); // 2 cells per block before main path
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

  // Set of valid location codes coming from the Location Master (locations prop)
  const validLocationCodes = useMemo(() => new Set(locations.map((l) => l.LocationCode)), [locations]);

  // Items that map to a valid location (have row, bay and level in Location Master)
  const itemsWithValidLocation = useMemo(() => {
    if (!items) return new Map<string, ItemData>();
    const m = new Map<string, ItemData>();
    items.forEach((it) => {
      if (it.Location && validLocationCodes.has(it.Location)) {
        m.set(it.Location, it);
      }
    });
    return m;
  }, [items, validLocationCodes]);

  // Helper to derive a simple work order id (fallback to po-item key)
  const getWorkOrderId = (workOrder: Record<string, any>) => {
    const expressionKey = Object.keys(workOrder).find(
      (key) => key.includes('expression') && (key.includes('po_number') || key.includes('item_code'))
    );
    if (expressionKey) return String(workOrder[expressionKey] || '');
    return `${workOrder.po_number || ''}-${workOrder.item_code || ''}`;
  };

  // Helpers to extract qty/unit_price/total from dynamic response fields
  const getQuantity = (wo: Record<string, any>) => {
    const qKey = Object.keys(wo).find((k) => k.toLowerCase().includes('quantity'));
    if (qKey) return Number(wo[qKey] || 0);
    const expr = Object.keys(wo).find((k) => k.includes('expression') && k.includes('quantity'));
    if (expr) return Number(wo[expr] || 0);
    return Number(wo.quantity || wo.qty || 0);
  };

  const getUnitPrice = (wo: Record<string, any>) => {
    const pKey = Object.keys(wo).find((k) => k.toLowerCase().includes('unit_price') || k.toLowerCase().includes('unitprice') || k.toLowerCase().includes('price'));
    if (pKey) return Number(wo[pKey] || 0);
    const expr = Object.keys(wo).find((k) => k.includes('expression') && k.includes('unit_price'));
    if (expr) return Number(wo[expr] || 0);
    return Number(wo.unit_price || wo.price || 0);
  };

  const getTotalFromWorkOrder = (wo: Record<string, any>) => {
    const tKey = Object.keys(wo).find((k) => k.toLowerCase().includes('total'));
    if (tKey) return Number(wo[tKey] || 0);
    const expr = Object.keys(wo).find((k) => k.includes('expression') && (k.includes('unit_price') || k.includes('quantity') || k.includes('total')));
    if (expr) return Number(wo[expr] || 0);
    // fallback to qty * unit price
    return getQuantity(wo) * getUnitPrice(wo);
  };

  const { nguageStore } = useStore();

  // Fetch work orders with status "Finished goods" when modal is open
  const { data: finishedWorkOrders = [], isLoading: finishedWorkOrdersLoading } = useQuery({
    queryKey: ['warehouseFinishedWorkOrders'],
    queryFn: async (): Promise<any[]> => {
      if (!nguageStore) return [];
      const resp = await nguageStore.GetPaginationData({
        table: 'work_order',
        skip: 0,
        take: 500,
        NGaugeId: '44',
      });
      const items = Array.isArray(resp) ? resp : resp?.data || [];
      return Array.isArray(items) ? items.filter((w: any) => String(w.wo_status).trim() === 'Finished goods') : [];
    },
    enabled: isModalOpen && !!nguageStore,
    staleTime: 0,
  });

  // Tooltip styles (small modern card)
  const tooltipStyles = {
    container: {
      position: 'fixed' as const,
      zIndex: 60,
      pointerEvents: 'none' as const,
      transform: 'translate3d(0,0,0)',
    },
    card: {
      minWidth: 160,
      maxWidth: 260,
      background: '#ffffff',
      borderRadius: 6,
      boxShadow: '0 8px 20px rgba(2, 6, 23, 0.08)',
      padding: '6px 8px',
      fontSize: 12,
      color: '#0f172a',
      border: '1px solid rgba(2,6,23,0.04)',
    },
    title: { fontWeight: 700, fontSize: 12, marginBottom: 4 },
    row: { display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2, alignItems: 'center' },
    label: { color: '#64748b', fontWeight: 600, fontSize: 11 },
    value: { color: '#0f172a', fontWeight: 700, fontSize: 12 },
  };

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

  // Compute totals from source data (original row/bay/level counts)
  const totalRowsCount = useMemo(() => {
    const vals = locations.map((l) => parseInt(l['RowNumber*'] || '0')).filter((n) => n > 0);
    return vals.length ? Math.max(...vals) : 0;
  }, [locations]);

  const totalBaysCount = useMemo(() => {
    const vals = locations.map((l) => parseInt(l.BayNumber || '0')).filter((n) => n > 0);
    return vals.length ? Math.max(...vals) : 0;
  }, [locations]);

  const totalLevelsCount = useMemo(() => {
    const vals = locations.map((l) => parseInt(l['LevelNumber*'] || '0')).filter((n) => n > 0);
    return vals.length ? Math.max(...vals) : 0;
  }, [locations]);

  const svgWidth = cellStartX + maxBay * cellWidth;
  const svgHeight = cellStartY + maxRow * cellHeight;

  // Sync scroll positions between headers and main content
  useEffect(() => {
    const mainScroll = mainScrollRef.current;
    if (!mainScroll) return;

    const handleScroll = () => {
      // sync headers
      if (topHeaderRef.current) {
        topHeaderRef.current.scrollLeft = mainScroll.scrollLeft;
      }
      if (leftHeaderRef.current) {
        leftHeaderRef.current.scrollTop = mainScroll.scrollTop;
      }

      // update viewport using rAF to avoid thrashing renders
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setViewport({
          left: Math.max(0, mainScroll.scrollLeft),
          top: Math.max(0, mainScroll.scrollTop),
          width: mainScroll.clientWidth,
          height: mainScroll.clientHeight,
        });
      });
    };

    // initialize viewport
    setViewport({ left: mainScroll.scrollLeft, top: mainScroll.scrollTop, width: mainScroll.clientWidth, height: mainScroll.clientHeight });

    mainScroll.addEventListener('scroll', handleScroll);
    const onResize = () => {
      setViewport({ left: mainScroll.scrollLeft, top: mainScroll.scrollTop, width: mainScroll.clientWidth, height: mainScroll.clientHeight });
    };
    window.addEventListener('resize', onResize);

    return () => {
      mainScroll.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Auto-scroll and animate to selected location
  useEffect(() => {
    if (!selectedLocation || !mainScrollRef.current) return;

    // Try to locate the rendered <g> for the selected cell and scroll to it precisely.
    const container = mainScrollRef.current;
    const allCells = Array.from(container.querySelectorAll('g')) as SVGGElement[];
    const elem = allCells.find((el) => el.getAttribute('data-location-code') === selectedLocation);

    if (elem) {
      // Prefer using scrollIntoView to let the browser handle edge cases and padding
      try {
        (elem as Element).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      } catch (e) {
        // Fallback to manual calculation below if scrollIntoView fails
      }
    }

    // Fallback: previous calculation based on grid coordinates
    const selectedCell = gridData.flatMap((g) => g.cells).find((cell) => cell.locationCode === selectedLocation);
    if (selectedCell) {
      const cellX = cellStartX + (selectedCell.bay - 1) * cellWidth;
      const cellY = cellStartY + (selectedCell.row - 1) * cellHeight;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const maxScrollLeft = Math.max(0, svgWidth - containerWidth);
      const maxScrollTop = Math.max(0, svgHeight - containerHeight);

      // Center the selected cell in the viewport using current cell dimensions
      let scrollLeft = cellX - Math.floor(containerWidth / 2) + Math.floor(cellWidth / 2);
      let scrollTop = cellY - Math.floor(containerHeight / 2) + Math.floor(cellHeight / 2);

      scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft));
      scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));

      container.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'smooth' });
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-semibold">Warehouse stats</div>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-0 text-xs gap-3">
                <div className="flex items-center px-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                    <span className="text-[11px] text-slate-500">Rows</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{totalRowsCount}</span>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                <div className="flex items-center px-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                    <span className="text-[11px] text-slate-500">Bays</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">{totalBaysCount}</span>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                <div className="flex items-center px-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" aria-hidden />
                    <span className="text-[11px] text-slate-500">Levels</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{totalLevelsCount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={() => setShowLegend(!showLegend)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Legend</span>
              </label>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="ml-2 text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-haspopup="dialog"
                aria-expanded={isModalOpen}
              >
                Add to Warehouse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid container with fixed headers */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden h-111 relative shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>            </div>
          </div>
        )}
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
              if (!isPathReservedPosition(row, 2)) {
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
            {/* Sub-path rendering removed: white sub-path rows, vertical sub-paths, and intersections suppressed for now */}

            {/* Draw thin cell boxes for DATA positions so empty boxes remain visible when sub-paths overlap */}
            {(() => {
              const buffer = 2;
              const startRow = Math.max(1, Math.floor(viewport.top / cellHeight) + 1 - buffer);
              const endRow = Math.min(maxRow, Math.ceil((viewport.top + viewport.height) / cellHeight) + buffer);
              const startBay = Math.max(1, Math.floor(viewport.left / cellWidth) + 1 - buffer);
              const endBay = Math.min(maxBay, Math.ceil((viewport.left + viewport.width) / cellWidth) + buffer);
              const rects: React.ReactNode[] = [];
              for (let row = startRow; row <= endRow; row++) {
                for (let bay = startBay; bay <= endBay; bay++) {
                  if (!isPathReservedPosition(row, 2) && !isPathReservedPosition(bay, 6)) {
                    const x = cellStartX + (bay - 1) * cellWidth;
                    const y = cellStartY + (row - 1) * cellHeight;
                    rects.push(
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
                }
              }
              return rects;
            })()}

            {/* Warehouse cells grouped by level */}
            {(() => {
              const buffer = 2;
              const startRow = Math.max(1, Math.floor(viewport.top / cellHeight) + 1 - buffer);
              const endRow = Math.min(maxRow, Math.ceil((viewport.top + viewport.height) / cellHeight) + buffer);
              const startBay = Math.max(1, Math.floor(viewport.left / cellWidth) + 1 - buffer);
              const endBay = Math.min(maxBay, Math.ceil((viewport.left + viewport.width) / cellWidth) + buffer);

              const nodes: React.ReactNode[] = [];

              gridData.forEach((gridItem) => {
                const [rowStr, bayStr] = gridItem.gridKey.split('-');
                const row = parseInt(rowStr);
                const bay = parseInt(bayStr);

                // skip groups outside viewport
                if (row < startRow || row > endRow || bay < startBay || bay > endBay) return;

                // Render 10 fixed levels per cell (bottom = level 1, top = level 10)
                {
                  const levels = gridItem.cells;
                  const levelMap = new Map<number, GridCell>();
                  levels.forEach((c) => levelMap.set(c.level, c));
                  const TOTAL_LEVELS = 6; // warehouse max level
                  const sliceHeight = Math.max(12, Math.floor((cellHeight - 8) / TOTAL_LEVELS));

                  for (let levelNum = 1; levelNum <= TOTAL_LEVELS; levelNum++) {
                    const cell = levelMap.get(levelNum);
                    const x = cellStartX + (bay - 1) * cellWidth;
                    const y = cellStartY + (row - 1) * cellHeight;
                    const isSelected = !!cell && cell.isSelected;
                    const itemAtCell = cell ? itemsWithValidLocation.get(cell.locationCode) : undefined;

                    const sliceIndexFromBottom = levelNum - 1; // 0 = bottom
                    const sliceY = y + cellHeight - sliceHeight * (sliceIndexFromBottom + 1);
                    const sliceLabel = `L${levelNum}`;
                    const showLabel = isSelected || sliceHeight >= 12;

                    // Determine fill/stroke:
                    // - occupied (item exists at this exact location) => yellow
                    // - location exists but no item => dark gray (shelved)
                    // - location does not exist => light gray (empty)
                    const hasLocation = !!cell;
                    const isOccupied = !!itemAtCell;

                    const fill = isSelected
                      ? '#2563eb'
                      : isOccupied
                        ? '#fbbf24'
                        : hasLocation
                          ? '#9ca3af' // dark gray for existing shelf without item
                          : '#f1f5f9'; // very light for non-existent level

                    const stroke = isSelected ? '#1e40af' : isOccupied ? '#c4a208' : '#e2e8f0';

                    nodes.push(
                      <g key={`cell-${row}-${bay}-L${levelNum}`} data-location-code={cell?.locationCode || ''}>
                        {/* Highlight whole stack when selected (only if any level in this stack is selected) */}
                        {isSelected && (
                          <rect
                            x={x - 2}
                            y={y - 2}
                            width={cellWidth + 4}
                            height={cellHeight + 4}
                            fill="none"
                            stroke="#1e40af"
                            strokeWidth="1.6"
                            rx="6"
                            opacity="0.12"
                          />
                        )}

                        {/* Slice */}
                        <rect
                          x={x + 2}
                          y={sliceY + 1}
                          width={cellWidth - 4}
                          height={sliceHeight - 2}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? 1.6 : 0.8}
                          rx={4}
                          className={`warehouse-skeleton ${isSelected ? 'warehouse-pulse' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cell?.locationCode) onLocationClick?.(cell.locationCode);
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            // Only show tooltip when an item is present at this location
                            if (!itemAtCell) return;
                            setTooltip({
                              visible: true,
                              x: e.clientX + 12,
                              y: e.clientY + 12,
                              item: itemAtCell,
                              location: cell?.zoneData,
                              level: levelNum,
                              locationCode: cell?.locationCode,
                            });
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            setTooltip((t) => (t.visible ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t));
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setTooltip((t) => ({ ...t, visible: false }));
                          }}
                          style={{ cursor: cell ? 'pointer' : 'default' }}
                        />

                        {/* Level label only when enough space or selected */}
                        {showLabel && (
                          <text
                            x={x + 6}
                            y={sliceY + Math.max(10, sliceHeight / 2)}
                            fontSize={Math.min(10, Math.max(8, Math.floor(sliceHeight / 2)))}
                            fill={isSelected ? '#e6f0ff' : '#0f172a'}
                            textAnchor="start"
                            dominantBaseline="middle"
                            fontWeight={700}
                            pointerEvents="none"
                          >
                            {sliceLabel}
                          </text>
                        )}

                        {/* Selected slice shows qty in the center */}
                        {isSelected && isOccupied && (
                          <text x={x + cellWidth - 8} y={sliceY + sliceHeight / 2} fontSize="10" fill="#fff7cc" textAnchor="end" dominantBaseline="middle" fontWeight={700} pointerEvents="none">
                            Qty: {itemAtCell?.Qty}
                          </text>
                        )}
                      </g>
                    );
                  }
                }
              });

              return nodes;
            })()}

            {/* Horizontal main path rows - rendered last for proper z-index */}
            {Array.from({ length: maxRow }).map((_, rowIdx) => {
              const row = rowIdx + 1;
              if (isMainPathPosition(row, 2)) {
                const y = cellStartY + (row - 1) * cellHeight;
                const pathHeight = cellHeight / 2;
                const pathY = y + (cellHeight - pathHeight) / 2; // Center vertically
                // Calculate horizontal path index (1, 2, 3, ...)
                // Each row block has `blockSize=2` data rows + 1 main path -> blockLength = 3
                const pathIndex = Math.ceil(row / (2 + 1));
                return (
                  <g key={`path-row-${row}`}>
                    {/* Background */}
                    <rect
                      x={cellStartX}
                      y={pathY}
                      width={maxBay * cellWidth}
                      height={pathHeight}
                      fill="#000000"
                      opacity="0.7"
                    />
                    {/* Center dashed line */}
                    <line
                      x1={cellStartX}
                      y1={pathY + pathHeight / 2}
                      x2={cellStartX + maxBay * cellWidth}
                      y2={pathY + pathHeight / 2}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                    {/* Path number label */}
                    <text
                      x={cellStartX + cellWidth / 2}
                      y={pathY + pathHeight / 2}
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
                      y={pathY}
                      width={maxBay * cellWidth}
                      height={pathHeight}
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
                const pathWidth = cellWidth / 2;
                const pathX = x + (cellWidth - pathWidth) / 2; // Center horizontally
                // Calculate vertical path index (1, 2, 3, ...)
                // Each bay block has `blockSize=6` data bays + 1 main path -> blockLength = 7
                const pathIndex = Math.ceil(bay / (6 + 1));
                return (
                  <g key={`path-bay-${bay}`}>
                    {/* Background */}
                    <rect
                      x={pathX}
                      y={cellStartY}
                      width={pathWidth}
                      height={maxRow * cellHeight}
                      fill="#000000"
                      opacity="0.7"
                    />
                    {/* Center dashed line */}
                    <line
                      x1={pathX + pathWidth / 2}
                      y1={cellStartY}
                      x2={pathX + pathWidth / 2}
                      y2={cellStartY + maxRow * cellHeight}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeDasharray="8,4"
                    />
                    {/* Path number label */}
                    <text
                      x={pathX + pathWidth / 2}
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
                      x={pathX}
                      y={cellStartY}
                      width={pathWidth}
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

        {/* Tooltip overlay (fixed) */}
        {tooltip.visible && (
          <div style={{ ...tooltipStyles.container, left: tooltip.x, top: tooltip.y }}>
            <div style={tooltipStyles.card}>
              <div style={tooltipStyles.title}>{tooltip.item ? tooltip.item.Item_Code : tooltip.location?.LocationCode || tooltip.locationCode}</div>

              {tooltip.item && (
                <div>
                  <div style={tooltipStyles.row}><div style={tooltipStyles.label}>Quantity</div><div style={tooltipStyles.value}>{tooltip.item.Qty}</div></div>
                  <div style={tooltipStyles.row}><div style={tooltipStyles.label}>Location</div><div style={tooltipStyles.value}>{tooltip.item.Location}</div></div>
                </div>
              )}

              {tooltip.location && (
                <div>
                  <div style={tooltipStyles.row}><div style={tooltipStyles.label}>Warehouse</div><div style={tooltipStyles.value}>{tooltip.location.WarehouseName}</div></div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Simple Modal (controlled by Open modal button) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-4/5 h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Finished Goods Work Orders
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-900 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {finishedWorkOrdersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Loader className="w-4 h-4 animate-spin" /> Loading work orders...
                    </div>
                  </div>
                ) : finishedWorkOrders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-gray-600 dark:text-gray-400">No finished goods work orders available.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                            <th className="px-4 py-3 text-left">
                              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label="select all" />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">WO ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">PO #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Unit Price</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {finishedWorkOrders.map((wo: any, idx: number) => (
                            <tr key={wo.ROWID || wo.rowid || `${getWorkOrderId(wo)}-${idx}`} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label={`select-${idx}`} />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{getWorkOrderId(wo)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{wo.item_code || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{wo.item || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{wo.po_number || '-'}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{Number(getQuantity(wo) || 0)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${Number(getUnitPrice(wo) || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${Number(getTotalFromWorkOrder(wo) || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                <Badge color={getStatusColor(wo.wo_status)} variant="solid">
                                  {wo.wo_status || '-'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-5 py-2 bg-gray-50 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
                style={{ backgroundColor: '#ffffff', borderColor: '#cacaca' }}
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

            {/* Main path legend */}
            <div className="flex items-center gap-2">
              <svg width="14" height="8" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="2" width="14" height="4" fill="#000000" opacity="0.7" />
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
            {(() => {
              const buffer = 2;
              const startBay = Math.max(1, Math.floor(viewport.left / cellWidth) + 1 - buffer);
              const endBay = Math.min(maxBay, Math.ceil((viewport.left + viewport.width) / cellWidth) + buffer);
              const nodes: React.ReactNode[] = [];
              for (let visualPos = startBay; visualPos <= endBay; visualPos++) {
                if (!isPathReservedPosition(visualPos, 6)) {
                  const dataPos = getDataPosition(visualPos, 6);
                  const i = visualPos - 1;
                  nodes.push(
                    <text key={`bay-label-${i}`} x={cellStartX + i * cellWidth + cellWidth / 2} y={headerSize - 10} fontSize="12" fill="#475569" textAnchor="middle" fontWeight="700">
                      B{dataPos}
                    </text>
                  );
                }
              }
              return nodes;
            })()}
          </svg>
        </div>

        {/* Fixed Left Header - Row numbers */}
        <div
          ref={leftHeaderRef}
          className="absolute top-0 left-0 bg-linear-to-r from-slate-100 to-slate-50 border-r border-slate-200"
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
            {(() => {
              const buffer = 2;
              const startRow = Math.max(1, Math.floor(viewport.top / cellHeight) + 1 - buffer);
              const endRow = Math.min(maxRow, Math.ceil((viewport.top + viewport.height) / cellHeight) + buffer);
              const nodes: React.ReactNode[] = [];
              for (let visualPos = startRow; visualPos <= endRow; visualPos++) {
                if (!isPathReservedPosition(visualPos, 2)) {
                  const dataPos = getDataPosition(visualPos, 2);
                  const i = visualPos - 1;
                  nodes.push(
                    <text key={`row-label-${i}`} x={headerSize / 2} y={cellStartY + i * cellHeight + cellHeight / 2} fontSize="12" fill="#475569" textAnchor="middle" dominantBaseline="middle" fontWeight="700">
                      R{dataPos}
                    </text>
                  );
                }
              }
              return nodes;
            })()}
          </svg>
        </div>

        {/* Top-left corner - empty cell */}
        <div
          className="absolute top-0 left-0 bg-linear-to-br from-slate-100 to-slate-50 border-b border-r border-slate-200"
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
