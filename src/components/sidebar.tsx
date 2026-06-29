"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, LineChart, PiggyBank, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/stocks", label: "Stocks", icon: LineChart },
  { href: "/savings", label: "Savings", icon: PiggyBank },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-[#171b27] text-slate-300 md:flex">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-white/5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500 text-sm font-bold text-white">
          FT
        </div>
        <span className="text-[15px] font-semibold text-white">FinanceTracker</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/5 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-emerald-400" />
              )}
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-white/5 px-5 py-4 text-xs text-slate-500">
        <Globe className="h-4 w-4" />
        English
      </div>
    </aside>
  );
}
