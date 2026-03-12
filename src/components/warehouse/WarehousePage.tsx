'use client';

import { useStore } from '@/store/store-context';
import { ItemData, LocationData } from '@/utils/csvParser';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { ItemSelector } from './ItemSelector';
import { WarehouseVisualization } from './WarehouseVisualization';

export const WarehousePage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const selectedLocationCode = React.useMemo(() => {
    return selectedItem ? (selectedItem as any).location : undefined;
  }, [selectedItem]);

  const { nguageStore } = useStore();

  // Fetch item_warehouse data
  const {
    data: warehouseData = [],
    isLoading: warehouseLoading,
    error: warehouseQueryError,
  } = useQuery({
    queryKey: ['item_warehouse', '57'],
    queryFn: async () => {
      const pagination = await nguageStore.GetPaginationData({
        table: 'item_warehouse',
        skip: 0,
        take: 30000,
        NGaugeId: '57',
      });
      const result = Array.isArray(pagination) ? pagination : pagination?.data || [];
      return result;
    },
    enabled: !!nguageStore,
    staleTime: 0,
  });

  // Fetch item descriptions from item table
  const {
    data: itemDescriptionsData = [],
    isLoading: itemDescLoading,
    error: itemDescQueryError,
  } = useQuery({
    queryKey: ['item', '33'],
    queryFn: async () => {
      const pagination = await nguageStore.GetPaginationData({
        table: 'item',
        skip: 0,
        take: 30000,
        NGaugeId: '33',
      });
      const result = Array.isArray(pagination) ? pagination : pagination?.data || [];
      return result;
    },
    enabled: !!nguageStore,
    staleTime: Infinity,
  });

  // Merge warehouse and item description data
  const itemsData: ItemData[] = React.useMemo(() => {
    const itemDescMap = new Map(
      (itemDescriptionsData as any[]).map((item) => {
        // Handle various column name formats for item code and description
        const code = item.Item_code;
        const desc = item.item_description;

        return [code.toLowerCase(), desc];
      })
    );

    return (warehouseData as any[]).map((item) => {
      // Get item_code from warehouse data, handling various column formats
      const warehouseItemCode = (item.item_code || item.Item_code || item.ItemCode || item.CODE || '')
        .toString()
        .trim()
        .toLowerCase();
      
      return {
        item_code: item.item_code || item.Item_code || item.ItemCode || '',
        item_description: itemDescMap.get(warehouseItemCode) || 'N/A',
        location: item.location || item.Location || '',
        quantity: item.quantity || item.Quantity || '',
        last_updated_date: item.last_updated_date || item.Last_Updated_Date || '',
      };
    });
  }, [warehouseData, itemDescriptionsData]);

  const itemsLoading = warehouseLoading || itemDescLoading;
  const itemsQueryError = warehouseQueryError || itemDescQueryError;

  // Fetch location master via nguageStore.GetPaginationData
  const {
    data: locationsData = [],
    isLoading: locationsLoading,
    error: locationsQueryError,
  } = useQuery({
    queryKey: ['location_master', '55'],
    queryFn: async (): Promise<LocationData[]> => {
      const pagination = await nguageStore.GetPaginationData({
        table: 'location_master',
        skip: 0,
        take: 26000,
        NGaugeId: '55',
      });
      const result = Array.isArray(pagination) ? pagination : pagination?.data || [];
      return result as LocationData[];
    },
    enabled: !!nguageStore,
    staleTime: 0,
  });

  // selectedLocationCode is derived from selectedItem via useMemo

  const handleLocationClick = useCallback((locationCode: string) => {
    // Find the item with this location
    const item = (itemsData as ItemData[]).find((i) => i.location === locationCode);
    if (item) {
      setSelectedItem(item);
    }
  }, [itemsData]);

  const isLoading = itemsLoading || locationsLoading;
  const queryError = itemsQueryError || locationsQueryError;

  if (queryError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{String(queryError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50">
      {/* Main Content */}
      <div className="mx-auto p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Sidebar - Item Selector */}
          <div className="lg:col-span-3">
            <ItemSelector
              items={itemsData as ItemData[]}
              locations={locationsData as LocationData[]}
              selectedItem={selectedItem}
              onItemSelect={setSelectedItem}
              isLoading={isLoading}
            />
          </div>

          {/* Right Content - Warehouse Visualization */}
          <div className="lg:col-span-3">
            <WarehouseVisualization
              locations={locationsData as LocationData[]}
              selectedLocation={selectedLocationCode}
              selectedItem={selectedItem}
              items={itemsData as ItemData[]}
              onLocationClick={handleLocationClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
