'use client';

import React, { useMemo } from 'react';
import { ItemData, LocationData } from '@/utils/csvParser';
import { Select } from "@/components/ui";
import { Package } from 'lucide-react';

interface ItemSelectorProps {
  items: ItemData[];
  locations: LocationData[];
  selectedItem: ItemData | null;
  onItemSelect: (item: ItemData | null) => void;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  locations,
  selectedItem,
  onItemSelect,
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
    return locationMap.get(selectedItem.Location);
  }, [selectedItem, locationMap]);

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Item Selector */}
      <div className="lg:w-[25%]">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          <Package className="inline mr-2 w-4 h-4" />
          Select Item to Track
        </label>

        <Select
          value={selectedItem?.Item_Code || ''}
          onChange={(value) => {
            const item = items.find((i) => i.Item_Code === value) || null;
            onItemSelect(item);
          }}
          data={[
            { label: '-- Select an Item --', value: '' },
            ...items.map((item) => ({
              label: item.Item_Code,
              value: item.Item_Code,
            })),
          ]}
        />

        {/* Description */}
        {selectedItem && (
          <div className="mt-1 bg-amber-50 p-1 rounded border border-amber-200">
            {/* <p className="text-xs font-medium text-gray-500 uppercase mb-1">Description</p> */}
            <p className="text-xs text-gray-700">
              {selectedItem.Item_Description}
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
              <p className="text-xs font-bold text-gray-800">{selectedItem.Item_Code}</p>
            </div>

            {/* Quantity */}
            <div className="bg-green-50 p-1.5 rounded border border-green-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Qty</p>
              <p className="text-xs font-bold text-green-600">{selectedItem.Qty}</p>
            </div>

            {/* Location Code */}
            <div className="bg-purple-50 p-1.5 rounded border border-purple-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
              <p className="text-xs font-bold text-purple-600">{selectedItem.Location}</p>
            </div>

            {/* Last Updated */}
            <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Updated</p>
              <p className="text-xs font-semibold text-gray-700">{selectedItem.Last_Updated_Date}</p>
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
        <div className="w-full bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Select an item to view its warehouse location</p>
        </div>
      )}
    </div>
  );
};
