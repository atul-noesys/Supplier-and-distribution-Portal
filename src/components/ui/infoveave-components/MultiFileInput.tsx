"use client";

import { MultiFileInput as InfoveaveMultiFileInput } from "@infoveave/ui-components";
import { ReactNode } from "react";

interface MultiFileInputProps {
  label?: ReactNode;
  orientation?: "responsive" | "horizontal" | "vertical" | null | undefined;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onValueChange?: (files: any[]) => void;
  error?: ReactNode;
}

export const MultiFileInput = ({
  label,
  orientation,
  maxFiles = 3,
  maxSize = 50 * 1024 * 1024,
  accept = "*",
  multiple = true,
  className,
  onValueChange,
  error,
}: MultiFileInputProps) => {
  return (
    <InfoveaveMultiFileInput
      label={label}
      orientation={orientation}
      maxFiles={maxFiles}
      maxSize={maxSize}
      accept={accept}
      multiple={multiple}
      className={className}
      onValueChange={onValueChange}
      error={error}
    />
  );
};

export default MultiFileInput;
