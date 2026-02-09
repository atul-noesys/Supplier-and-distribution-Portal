import React from "react";

type StepNumber = 1 | 2 | 3 | 4 | 5;
type BadgeSize = "sm" | "md";

interface StepBadgeProps {
  step: StepNumber; // Step number 1-5
  size?: BadgeSize; // Badge size
  label?: string | React.ReactNode; // Optional label text
  children?: React.ReactNode; // Badge content
}

const StepBadge: React.FC<StepBadgeProps> = ({
  step,
  size = "md",
  label,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-3 py-1 justify-center gap-2 rounded-full font-semibold";

  // Define size styles
  const sizeStyles = {
    sm: "text-xs",
    md: "text-sm",
  };

  // Define color styles for each step (1-5) with blue shades from light to dark
  const stepStyles = {
    1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
    2: "bg-blue-200 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300",
    3: "bg-blue-400 text-blue-900 dark:bg-blue-700/50 dark:text-blue-200",
    4: "bg-blue-500 text-white dark:bg-blue-600 dark:text-white",
    5: "bg-blue-700 text-white dark:bg-blue-800 dark:text-white",
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = stepStyles[step];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      <span className="font-bold text-base">{step}</span>
      {label && <span>{label}</span>}
      {children}
    </span>
  );
};

export default StepBadge;
