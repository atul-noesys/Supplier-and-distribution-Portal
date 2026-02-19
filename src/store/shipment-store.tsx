import { makeAutoObservable } from 'mobx';
import { ShipmentItem, RowData } from '@/types/nguage-rowdata';

export class ShipmentStore {
  shipmentItems: ShipmentItem[] = [];
  editingItemIndex: number | null = null;
  currentShipment: RowData | null = null;
  currentShipmentItems: RowData[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  addItem(item: ShipmentItem) {
    this.shipmentItems.push(item);
  }

  updateItem(index: number, item: ShipmentItem) {
    if (index >= 0 && index < this.shipmentItems.length) {
      this.shipmentItems[index] = item;
    }
  }

  deleteItem(index: number) {
    if (index >= 0 && index < this.shipmentItems.length) {
      this.shipmentItems.splice(index, 1);
    }
  }

  setEditingItemIndex(index: number | null) {
    this.editingItemIndex = index;
  }

  getEditingItem(): ShipmentItem | null {
    if (this.editingItemIndex !== null && this.editingItemIndex < this.shipmentItems.length) {
      return this.shipmentItems[this.editingItemIndex];
    }
    return null;
  }

  clearItems() {
    this.shipmentItems = [];
    this.editingItemIndex = null;
  }

  setCurrentShipment(shipment: RowData, items: RowData[] = []) {
    this.currentShipment = shipment;
    this.currentShipmentItems = items;
  }

  clearCurrentShipment() {
    this.currentShipment = null;
    this.currentShipmentItems = [];
  }

  getCurrentShipment(): RowData | null {
    return this.currentShipment;
  }

  getCurrentShipmentItems(): RowData[] {
    return this.currentShipmentItems;
  }

  getItems(): ShipmentItem[] {
    return this.shipmentItems;
  }

  getItemCount(): number {
    return this.shipmentItems.length;
  }
}
