import { TextInput as InfoveaveTextInput } from "@infoveave/ui-components";
import React from "react";

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

/**
 * Reusable TextInput wrapper component
 * Wraps @infoveave/ui-components TextInput with customizable styling
 * Allows global override of disabled state styling and other visual properties
 */
export const TextInput = ({
  label,
  type = "text",
  value = "",
  disabled = false,
  placeholder,
  onValueChange = () => {},
  className,
  containerClassName,
  error,
}: TextInputProps) => {
  // Merge className with disabled state styling
  const mergedClassName = disabled 
    ? `${className || ''} text-black dark:text-black`
    : className;

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
