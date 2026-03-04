"use client";

import { useTranslation } from "@/i18n";
import React from "react";

export default function WarehousePage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Warehouse</h1>
      <p className="text-gray-600">Warehouse management page content</p>
    </div>
  );
}
