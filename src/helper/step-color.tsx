export const stepColors: Record<string, { bg: string; border: string; text: string }> =
  {
    "Step 1": {
      bg: "bg-blue-50 dark:bg-blue-950",
      border: "border-blue-200 dark:border-blue-700",
      text: "text-blue-700 dark:text-blue-300",
    },
    "Step 2": {
      bg: "bg-purple-50 dark:bg-purple-950",
      border: "border-purple-200 dark:border-purple-700",
      text: "text-purple-700 dark:text-purple-300",
    },
    "Step 3": {
      bg: "bg-pink-50 dark:bg-pink-950",
      border: "border-pink-200 dark:border-pink-700",
      text: "text-pink-700 dark:text-pink-300",
    },
    "Step 4": {
      bg: "bg-amber-50 dark:bg-amber-950",
      border: "border-amber-200 dark:border-amber-700",
      text: "text-amber-700 dark:text-amber-300",
    },
    "Step 5": {
      bg: "bg-green-50 dark:bg-green-950",
      border: "border-green-200 dark:border-green-700",
      text: "text-green-700 dark:text-green-300",
    },
    "Step 6": {
      bg: "bg-teal-50 dark:bg-teal-950",
      border: "border-teal-200 dark:border-teal-700",
      text: "text-teal-700 dark:text-teal-300",
    },
    "Step 7": {
      bg: "bg-orange-50 dark:bg-orange-950",
      border: "border-orange-200 dark:border-orange-700",
      text: "text-orange-700 dark:text-orange-300",
    },
    "Step 8": {
      bg: "bg-rose-50 dark:bg-rose-950",
      border: "border-rose-200 dark:border-rose-700",
      text: "text-rose-700 dark:text-rose-300",
    },
    "Step 9": {
      bg: "bg-indigo-50 dark:bg-indigo-950",
      border: "border-indigo-200 dark:border-indigo-700",
      text: "text-indigo-700 dark:text-indigo-300",
    },
    "Step 10": {
      bg: "bg-lime-50 dark:bg-lime-950",
      border: "border-lime-200 dark:border-lime-700",
      text: "text-lime-700 dark:text-lime-300",
    },
  };

export const getStepColors = (sequence: number) => {
  const stepKey = `Step ${sequence}`;
  return stepColors[stepKey] || stepColors["Step 1"];
};