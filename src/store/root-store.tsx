// store/root-store.ts
import { NguageStore } from "./nguage-store";
import { POStore } from "./po-store";

export class RootStore {
  nguageStore: NguageStore;
  poStore: POStore;

  constructor() {
    this.nguageStore = new NguageStore();
    this.poStore = new POStore();
  }
}

export const rootStore = new RootStore();