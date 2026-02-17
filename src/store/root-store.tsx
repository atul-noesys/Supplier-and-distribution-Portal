// store/root-store.ts
import { NguageStore } from "./nguage-store";
import { POStore } from "./po-store";
import { ShipmentStore } from "./shipment-store";

export class RootStore {
  nguageStore: NguageStore;
  poStore: POStore;
  shipmentStore: ShipmentStore;

  constructor() {
    this.nguageStore = new NguageStore();
    this.poStore = new POStore();
    this.shipmentStore = new ShipmentStore();
  }
}

export const rootStore = new RootStore();