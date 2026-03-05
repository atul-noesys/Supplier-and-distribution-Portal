/**
 * CSV Parser utility for loading and parsing warehouse data
 */

export async function parseCSV(url: string): Promise<Record<string, string>[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);

    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim());

    // Parse rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

export interface ItemData {
  Item_Code: string;
  Item_Description: string;
  Location: string;
  Qty: string;
  Last_Updated_Date: string;
}

export interface LocationData {
  WarehouseCode: string;
  WarehouseName: string;
  ZoneName: string;
  Division: string;
  LocationCode: string;
  'RowNumber*': string;
  BayNumber: string;
  'LevelNumber*': string;
  BinNumber: string;
  'IsDoubleDeep(Yes/No)': string;
  'IsLeftAisle(Yes/No)': string;
  'IsRightAisle(Yes/No)': string;
  Length: string;
  Width: string;
  Height: string;
  LWHBaseUnit: string;
  Weight: string;
  WeightUnit: string;
  'DockDirection(N/E/S/W)*': string;
  DockCount: string;
  StagingCount: string;
  VirtualDockCount: string;
  RackType: string;
  'Location Status': string;
}
