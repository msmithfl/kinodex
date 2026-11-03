import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names, letting a later Tailwind class override an earlier one ("px-2 px-4" → "px-4"),
// so components can take a className that adjusts their defaults
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
