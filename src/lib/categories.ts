export const CATEGORIES = [
  "Salary",
  "Dividends",
  "Food",
  "Food Outside",
  "Rent",
  "Subscriptions",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Alcohol",
  "Swish payment",
  "Vacation",
  "To Savings",
  "Other",
];

// Tailwind background classes for the coloured category dot, matching the
// template's palette.
const CATEGORY_COLORS: Record<string, string> = {
  Salary: "bg-blue-500",
  Dividends: "bg-teal-500",
  Food: "bg-emerald-500",
  "Food Outside": "bg-lime-500",
  Rent: "bg-rose-500",
  Subscriptions: "bg-pink-500",
  Transport: "bg-violet-500",
  Utilities: "bg-cyan-500",
  Entertainment: "bg-amber-500",
  Shopping: "bg-yellow-500",
  Alcohol: "bg-purple-600",
  "Swish payment": "bg-black",
  Vacation: "bg-sky-500",
  "To Savings": "bg-green-600",
  Other: "bg-slate-400",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-400";
}

// Hex equivalents of the palette above, for contexts where a Tailwind class is
// not usable (e.g. SVG fills in the expenses pie chart).
const CATEGORY_HEX: Record<string, string> = {
  Salary: "#3b82f6",
  Dividends: "#14b8a6",
  Food: "#10b981",
  "Food Outside": "#84cc16",
  Rent: "#f43f5e",
  Subscriptions: "#ec4899",
  Transport: "#8b5cf6",
  Utilities: "#06b6d4",
  Entertainment: "#f59e0b",
  Shopping: "#eab308",
  Alcohol: "#9333ea",
  "Swish payment": "#000000",
  Vacation: "#0ea5e9",
  "To Savings": "#16a34a",
  Other: "#94a3b8",
};

export function categoryHex(category: string): string {
  return CATEGORY_HEX[category] ?? "#94a3b8";
}
