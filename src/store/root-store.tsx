// store/root-store.ts
import { NguageStore } from "./nguage-store";

export class RootStore {
  nguageStore: NguageStore;

  constructor() {
    this.nguageStore = new NguageStore();
  }
}

export const rootStore = new RootStore();