"use client";

import { useEffect } from "react";
import { registerTranslations as registerDocumentViewersTranslations } from "@infoveave/document-viewers";

export function 
AppInitializer() {
  useEffect(() => {
    const initialize = async () => {
      try {
        const { initializeI18n } = await import("@infoveave/i18n-core");
        const { configurePdfWorker } = await import("@infoveave/document-viewers");

        // initialize i18n
        await initializeI18n();
        registerDocumentViewersTranslations();

        // PDF worker
        await configurePdfWorker({
          workerSrc: "/v8/pdf/build/pdf.worker.min.mjs",
          cmapUrl: "/v8/pdf/cmaps/",
          standardFontDataUrl: "/v8/pdf/standard_fonts/",
          wasmUrl: "/v8/pdf/wasm/",
        });
      } catch (error) {
        console.error("Failed to initialize app modules:", error);
      }
    };

    initialize();
  }, []);

  return null;
}
