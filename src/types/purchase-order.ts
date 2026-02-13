export interface POItem {
  ROWID?: number;
  InfoveaveBatchId?: number;
  po_number?: string;
  po_status?: string;
  item_code?: string;
  item?: string;
  unit_price?: string | number;
  quantity?: string | number;
  total?: string | number;
  status?: string;
  step_name?: string;
  step_history?: string | null;
  vendor_id?: string;
  vendor_name?: string;
  remarks?: string;
  document?: string;
  [key: string]: any;
}
