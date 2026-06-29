export const CATEGORIES = [
  "Salary",
  "Dividends",
  "Food",
  "Rent",
  "Subscriptions",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Other",
];

// Tailwind background classes for the coloured category dot, matching the
// template's palette.
const CATEGORY_COLORS: Record<string, string> = {
  Salary: "bg-blue-500",
  Dividends: "bg-teal-500",
  Food: "bg-emerald-500",
  Rent: "bg-rose-500",
  Subscriptions: "bg-pink-500",
  Transport: "bg-violet-500",
  Utilities: "bg-cyan-500",
  Entertainment: "bg-amber-500",
  Shopping: "bg-yellow-500",
  Other: "bg-slate-400",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-400";
}
