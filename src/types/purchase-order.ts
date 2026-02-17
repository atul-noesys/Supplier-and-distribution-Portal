/**
 * Key-value record format where each field is represented as {key, value}
 * This allows flexible, dynamic form population from API responses
 */
export interface KeyValueRecord {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * RowData interface for API compatibility
 * Ensures values sent to API are properly typed
 */
export interface RowData {
  [key: string]: string | number | null;
}

/**
 * POItem is a RowData record representing a purchase order item
 * Extends RowData for proper API type compatibility
 */
export type POItem = RowData;

/**
 * ShipmentItem is a RowData record representing a shipment item
 * Extends RowData for proper API type compatibility
 */
export type ShipmentItem = RowData;
