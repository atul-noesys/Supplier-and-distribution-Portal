import { Select as InfoveaveSelect } from "@infoveave/ui-components";
import React from "react";

interface SelectProps {
  label?: string | React.ReactNode;
  value?: string | null;
  onChange?: (value: string | null) => void;
  onValueChange?: (value: string | null) => void;
  data?: readonly { label: string; value: string }[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  error?: string;
}

/**
 * Reusable Select wrapper component
 * Wraps @infoveave/ui-components Select with customizable styling
 * Allows global override of disabled state styling and other visual properties
 */
export const Select = ({
  label,
  value,
  onChange,
  onValueChange,
  data = [],
  disabled = false,
  placeholder,
  className = "max-w-full",
  containerClassName,
  error,
}: SelectProps) => {
  // Support both onChange and onValueChange for flexibility
  const handleChange = onValueChange || onChange || (() => {});

  // Normalize value to string or null
  const normalizedValue = value === undefined ? null : value;

  return (
    <div className={containerClassName}>
      <InfoveaveSelect
        label={label}
        value={normalizedValue}
        onValueChange={handleChange}
        data={data as readonly { label: string; value: string }[]}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default Select;
