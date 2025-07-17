import React from "react";
import { STATUS_COLORS, STATUS_TEXT } from "@/constants";
import type { StatusBadgeProps } from "@/lib/types";

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status];
  const text = STATUS_TEXT[status];
  const sizeClass = variant === "compact" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs";

  return (
    <span className={`${colorClass} ${sizeClass} rounded font-medium`}>
      {text}
    </span>
  );
}