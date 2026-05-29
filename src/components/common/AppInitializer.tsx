"use client";

import { useEffect } from "react";

export function 
AppInitializer() {
  useEffect(() => {
    const initialize = async () => {
      try {
        const { initializeI18n } = await import("@infoveave/i18n-core");
        const { configurePdfWorker, registerTranslations } = await import("@infoveave/document-viewers");
        const { registerTranslations : uiComponentsRegisterTranslations } = await import("@infoveave/ui-components");

        // initialize i18n
        await initializeI18n();
        registerTranslations();
        uiComponentsRegisterTranslations();

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
