'use client';

import { useStore } from '@/store/store-context';
import { ItemData, LocationData } from '@/utils/csvParser';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { ItemSelector } from './ItemSelector';
import { WarehouseVisualization } from './WarehouseVisualization';

export const WarehousePage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const selectedLocationCode = React.useMemo(() => {
    return selectedItem ? (selectedItem as any).Location : undefined;
  }, [selectedItem]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { nguageStore } = useStore();

  // Fetch toy products via nguageStore.GetPaginationData
  const {
    data: itemsData = [],
    isLoading: itemsLoading,
    error: itemsQueryError,
  } = useQuery({
    queryKey: ['toy_products'],
    queryFn: async (): Promise<ItemData[]> => {
      const pagination = await nguageStore.GetPaginationData({
        table: 'toy_products',
        skip: 0,
        take: 500,
        NGaugeId: '56',
      });
      const result = Array.isArray(pagination) ? pagination : pagination?.data || [];
      return result as ItemData[];
    },
    enabled: !!nguageStore,
    staleTime: 0,
  });

  // Fetch location master via nguageStore.GetPaginationData
  const {
    data: locationsData = [],
    isLoading: locationsLoading,
    error: locationsQueryError,
  } = useQuery({
    queryKey: ['location_master'],
    queryFn: async (): Promise<LocationData[]> => {
      const pagination = await nguageStore.GetPaginationData({
        table: 'location_master',
        skip: 0,
        take: 500,
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
    const item = (itemsData as ItemData[]).find((i) => i.Location === locationCode);
    if (item) {
      setSelectedItem(item);
    }
  }, [itemsData]);

  const isLoading = itemsLoading || locationsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
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
