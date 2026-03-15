import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSplit(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds <= 0) return "--:--";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return "--";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

export function formatNumber(num: number | null, decimals: number = 0): string {
  if (num === null) return "--";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function gradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "text-emerald-500";
    case "B":
      return "text-blue-500";
    case "C":
      return "text-yellow-500";
    case "D":
      return "text-orange-500";
    case "F":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

export function gradeBgColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "B":
      return "bg-blue-500/10 border-blue-500/20";
    case "C":
      return "bg-yellow-500/10 border-yellow-500/20";
    case "D":
      return "bg-orange-500/10 border-orange-500/20";
    case "F":
      return "bg-red-500/10 border-red-500/20";
    default:
      return "bg-gray-500/10 border-gray-500/20";
  }
}

export function workoutTypeIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "rowed":
    case "row":
      return "🚣";
    case "skierg":
    case "ski":
      return "⛷️";
    case "bikeerg":
    case "bike":
      return "🚴";
    default:
      return "🏋️";
  }
}

export function pacingStrategyLabel(strategy: string): {
  label: string;
  color: string;
} {
  switch (strategy.toLowerCase()) {
    case "negative split":
      return { label: "Negative Split", color: "text-emerald-500" };
    case "positive split":
      return { label: "Positive Split", color: "text-orange-500" };
    case "even split":
      return { label: "Even Split", color: "text-blue-500" };
    default:
      return { label: "Irregular", color: "text-yellow-500" };
  }
}
