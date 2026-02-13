export interface POItem {
  po_number?: string;
  item_code: string;
  item: string;
  unit_price: string;
  quantity: string;
  status: string;
  step_name: string;
  po_status?: string;
  vendor_id?: string;
  vendor_name?: string;
  remarks?: string;
  document?: string;
  total?: string;
}
