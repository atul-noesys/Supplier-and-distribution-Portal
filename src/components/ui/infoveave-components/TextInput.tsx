import { TextInput as InfoveaveTextInput } from "@infoveave/ui-components";
import React from "react";
import { cn } from "../../../lib/utils";

interface TextInputProps {
  label?: string | React.ReactNode;
  type?: string;
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  containerClassName?: string;
  error?: string;
}

export const TextInput = ({
  label,
  type = "text",
  value = "",
  disabled = false,
  placeholder,
  onValueChange = () => {},
  className = "max-w-full",
  containerClassName,
  error,
}: TextInputProps) => {
  // Merge className with disabled state styling using `cn`
  const mergedClassName = cn(
    className,
    disabled && "text-black dark:text-black"
  );

  return (
    <div className={containerClassName}>
      <InfoveaveTextInput
        label={label}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onValueChange={onValueChange}
        className={mergedClassName}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default TextInput;
