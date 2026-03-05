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
