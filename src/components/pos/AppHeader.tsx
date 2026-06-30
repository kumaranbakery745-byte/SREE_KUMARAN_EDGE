import { Link, useRouterState } from "@tanstack/react-router";
import { usePos, BRANCH_LABELS } from "@/lib/pos-store";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBag, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, logout } = usePos();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;
  const isAdmin = user.role === "admin";

  const tabs = [
    { to: "/pos", label: "POS", icon: ShoppingBag, show: true },
    { to: "/admin", label: "Manage", icon: Settings, show: isAdmin },
    { to: "/reports", label: "Reports", icon: BarChart3, show: true },
  ].filter((t) => t.show);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4 px-4 h-16">
        <div className="flex flex-col leading-tight pr-2">
          <span className="font-black tracking-[0.22em] text-slate-900 text-base">KUMARAN EDGE</span>
          <span className="text-[10px] text-slate-500 tracking-wide">an app by sree kumaran</span>
        </div>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 px-2.5 h-8 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            {BRANCH_LABELS[user.branch]}
          </span>
          <span className="text-xs text-slate-500 hidden md:inline">{user.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
