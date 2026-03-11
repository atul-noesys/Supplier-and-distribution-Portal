export interface ItemData {
  item_code: string;
  item_description: string;
  location: string;
  quantity: string;
  last_updated_date: string;
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
