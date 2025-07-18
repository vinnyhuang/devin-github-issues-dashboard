import React from "react";
import type { LoadingSpinnerProps } from "@/lib/types";

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center space-x-3">
      <div 
        className={`animate-spin ${spinnerSizes[size]} border-4 border-blue-600 border-t-transparent rounded-full`}
      />
      {text && (
        <span className={`text-gray-600 ${textSizes[size]}`}>
          {text}
        </span>
      )}
    </div>
  );
}