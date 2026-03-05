'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ItemData, LocationData, parseCSV } from '@/utils/csvParser';
import { ItemSelector } from './ItemSelector';
import { WarehouseVisualization } from './WarehouseVisualization';
import { Loader, AlertCircle, Package } from 'lucide-react';

export const WarehousePage: React.FC = () => {
  const [items, setItems] = useState<ItemData[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [itemsData, locationsData] = await Promise.all([
          parseCSV('/warehouse/Toy_Products.csv'),
          parseCSV('/warehouse/Location Master.csv'),
        ]);

        if (itemsData.length === 0 || locationsData.length === 0) {
          throw new Error('Failed to load warehouse data');
        }

        setItems(itemsData as unknown as ItemData[]);
        setLocations(locationsData as unknown as LocationData[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error loading warehouse data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update selected location when item changes
  useEffect(() => {
    if (selectedItem) {
      setSelectedLocationCode(selectedItem.Location);
    } else {
      setSelectedLocationCode(undefined);
    }
  }, [selectedItem]);

  const handleLocationClick = useCallback((locationCode: string) => {
    // Find the item with this location
    const item = items.find((i) => i.Location === locationCode);
    if (item) {
      setSelectedItem(item);
    }
  }, [items]);

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
              items={items}
              locations={locations}
              selectedItem={selectedItem}
              onItemSelect={setSelectedItem}
            />
          </div>

          {/* Right Content - Warehouse Visualization */}
          <div className="lg:col-span-3">
            <WarehouseVisualization
              locations={locations}
              selectedLocation={selectedLocationCode}
              onLocationClick={handleLocationClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
