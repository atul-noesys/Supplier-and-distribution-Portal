import { DateInput as InfoveeaveDateInput } from "@infoveave/ui-components";
import React from "react";

interface DateInputProps {
  label?: string | React.ReactNode;
  value?: Date;
  disabled?: boolean;
  onValueChange?: (value: Date | undefined) => void;
  className?: string;
  containerClassName?: string;
  error?: string;
  placeholder?: string;
}

/**
 * Reusable DateInput wrapper component
 * Wraps @infoveave/ui-components DateInput with customizable styling
 * Allows global override of disabled state styling and other visual properties
 */
export const DateInput = ({
  label,
  value,
  disabled = false,
  onValueChange = () => {},
  className = "max-w-full",
  containerClassName,
  error,
  placeholder,
}: DateInputProps) => {
  // Merge className with disabled state styling
  const mergedClassName = disabled 
    ? `${className || ''} text-black dark:text-black`
    : className;

  return (
    <div className={containerClassName}>
      <InfoveeaveDateInput
        label={label}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        className={mergedClassName}
        placeholder={placeholder}
        displayFormat="yyyy-MM-dd"
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default DateInput;
