"use client";

import { createContext, useContext } from "react";
import { rootStore, RootStore } from "./root-store";

const storeContext = createContext<RootStore>(rootStore);

export const StoreProvider = ({children} : {children :  React.ReactNode}) => {
    return(
    <storeContext.Provider value={rootStore}>{children}</storeContext.Provider>
    );
}

export const useStore = () => useContext(storeContext);

export const useRootStore = () => useContext(storeContext);