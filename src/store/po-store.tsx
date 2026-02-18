import { makeAutoObservable } from 'mobx';
import { POItem } from '@/types/nguage-rowdata';

export class POStore {
  poItems: POItem[] = [];
  editingItemIndex: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  addItem(item: POItem) {
    this.poItems.push(item);
  }

  updateItem(index: number, item: POItem) {
    if (index >= 0 && index < this.poItems.length) {
      this.poItems[index] = item;
    }
  }

  deleteItem(index: number) {
    if (index >= 0 && index < this.poItems.length) {
      this.poItems.splice(index, 1);
    }
  }

  setEditingItemIndex(index: number | null) {
    this.editingItemIndex = index;
  }

  getEditingItem(): POItem | null {
    if (this.editingItemIndex !== null && this.editingItemIndex < this.poItems.length) {
      return this.poItems[this.editingItemIndex];
    }
    return null;
  }

  clearItems() {
    this.poItems = [];
    this.editingItemIndex = null;
  }

  getItems(): POItem[] {
    return this.poItems;
  }

  getItemCount(): number {
    return this.poItems.length;
  }
}
