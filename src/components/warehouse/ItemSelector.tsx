"use client";

import { ItemData, LocationData } from '@/utils/csvParser';
import { Package, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ItemSelectorProps {
  items: ItemData[];
  locations: LocationData[];
  selectedItem: ItemData | null;
  onItemSelect: (item: ItemData | null) => void;
  isLoading?: boolean;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  locations,
  selectedItem,
  onItemSelect,
  isLoading,
}) => {
  const locationMap = useMemo(() => {
    const map = new Map<string, LocationData>();
    locations.forEach((loc) => {
      map.set(loc.LocationCode, loc);
    });
    return map;
  }, [locations]);

  const selectedLocationData = useMemo(() => {
    if (!selectedItem) return null;
    return locationMap.get(selectedItem.location);
  }, [selectedItem, locationMap]);

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {isLoading ? (
        <div className="w-full bg-white rounded shadow-sm p-9 border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      ) : (
        <>
      {/* Item Selector */}
      <div className="lg:w-[25%] relative">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          <Package className="inline mr-2 w-4 h-4" />
          Select Item to Track
        </label>

        {/* Searchable input replacing Infoveave Select. Keeps similar UI but allows searching by code or description. */}
        <SearchableItemSelect
          items={items}
          selectedItem={selectedItem}
          onItemSelect={onItemSelect}
        />

        {/* Description */}
        {selectedItem && (
          <div className="mt-1 bg-amber-50 p-1 rounded border border-amber-200">
            <p className="text-xs text-gray-700">
              {selectedItem.item_description}
            </p>
          </div>
        )}
      </div>

      {/* Selected Item Details */}
      {selectedItem && (
        <div className="lg:w-[75%] bg-white rounded shadow-sm p-2 border border-gray-200">
          <h3 className="text-xs font-bold text-gray-900 mb-2">Item Details</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
            {/* Item Code */}
            <div className="bg-blue-50 p-1.5 rounded border border-blue-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Item</p>
              <p className="text-xs font-bold text-gray-800">{selectedItem.item_code}</p>
            </div>

            {/* Quantity */}
            <div className="bg-green-50 p-1.5 rounded border border-green-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Qty</p>
              <p className="text-xs font-bold text-green-600">{selectedItem.quantity}</p>
            </div>

            {/* Location Code */}
            <div className="bg-purple-50 p-1.5 rounded border border-purple-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
              <p className="text-xs font-bold text-purple-600">{selectedItem.location}</p>
            </div>

            {/* Last Updated */}
            <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Updated</p>
              <p className="text-xs font-semibold text-gray-700">{selectedItem.last_updated_date.slice(0,10)}</p>
            </div>
          </div>

          {/* Location Details */}
          {selectedLocationData && (
            <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-1">
              <div className="bg-blue-50 p-1.5 rounded border border-blue-200 flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Warehouse</p>
                <p className="text-xs font-bold text-gray-800">
                  {selectedLocationData.WarehouseName}
                </p>
              </div>
              <div className="bg-orange-50 p-1.5 rounded border border-orange-200 flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Row</p>
                <p className="text-xs font-bold text-orange-600">
                  {selectedLocationData['RowNumber*']}
                </p>
              </div>
              <div className="bg-red-50 p-1.5 rounded border border-red-200 flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Bay</p>
                <p className="text-xs font-bold text-red-600">
                  {selectedLocationData.BayNumber}
                </p>
              </div>
              <div className="bg-indigo-50 p-1.5 rounded border border-indigo-200 flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500 uppercase">Level</p>
                <p className="text-xs font-bold text-indigo-600">
                  {selectedLocationData['LevelNumber*']}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedItem && (
        <div className="w-full bg-gray-50 rounded-lg p-2.5 text-center border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Select an item to view its warehouse location</p>
        </div>
      )}
        </>
      )}
    </div>
  );
};

interface SearchableItemSelectProps {
  items: ItemData[];
  selectedItem: ItemData | null;
  onItemSelect: (item: ItemData | null) => void;
}

const SearchableItemSelect: React.FC<SearchableItemSelectProps> = ({ items, selectedItem, onItemSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Measure input width and update dropdown width. Re-measure when selection or query changes.
  useEffect(() => {
    const measure = () => {
      // Prefer container width so dropdown matches total control width
      if (containerRef.current) {
        setDropdownWidth(containerRef.current.offsetWidth);
        return;
      }
      if (inputRef.current) {
        setDropdownWidth(inputRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedItem, query]);

  // Debounce search input to avoid filtering on every keystroke for very large datasets
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const [visibleCount, setVisibleCount] = useState(100);

  const q = debouncedQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items.slice(0, 100);
    // simple filter optimized with local variables
    const res: typeof items = [] as any;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const code = it.item_code && it.item_code.toLowerCase();
      const desc = (it.item_description || '').toLowerCase();
      if ((code && code.includes(q)) || (desc && desc.includes(q))) {
        res.push(it);
        if (res.length >= 100) break;
      }
    }
    return res;
  }, [items, q]);

  // Helper to highlight matched substrings (case-insensitive) with a yellow background
  const highlightText = (text?: string) => {
    const str = (text || '').toString();
    if (!q) return str;

    const lower = str.toLowerCase();
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let matchIndex = lower.indexOf(q, lastIndex);
    let keyIndex = 0;

    while (matchIndex !== -1) {
      if (matchIndex > lastIndex) {
        nodes.push(str.slice(lastIndex, matchIndex));
      }
      const matched = str.slice(matchIndex, matchIndex + q.length);
      nodes.push(
        <span key={`hl-${keyIndex}-${matchIndex}`} className="bg-yellow-200 px-0.5 rounded">
          {matched}
        </span>
      );
      keyIndex += 1;
      lastIndex = matchIndex + q.length;
      matchIndex = lower.indexOf(q, lastIndex);
    }

    if (lastIndex < str.length) {
      nodes.push(str.slice(lastIndex));
    }

    return nodes.length ? nodes : str;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedItem?.item_code ?? query)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by code or description"
          className="w-full min-w-75 pr-9 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white box-border"
        />
        {(selectedItem || query) && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => { setQuery(''); onItemSelect(null); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Clear selection"
          >
            <X className="w-3 h-3" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-72 overflow-auto"
          style={{ width: dropdownWidth ? `${dropdownWidth}px` : '280px' }}
        >
          {filtered.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No items found</div>
          ) : (
            <>
              {(filtered.slice(0, visibleCount)).map((it) => (
                <button
                  key={it.item_code}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                  onClick={() => { onItemSelect(it); setQuery(''); setOpen(false); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{highlightText(it.item_code)}</div>
                      <div className="text-xs text-gray-500">{highlightText(it.item_description)}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length > visibleCount && (
                <div className="p-2 text-center">
                  <button
                    className="text-sm text-blue-600 underline"
                    onClick={() => setVisibleCount((c) => Math.min(filtered.length, c + 200))}
                  >
                    Show more ({filtered.length - visibleCount} more)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
