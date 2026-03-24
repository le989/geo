"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Factory, Search, Kanban, Database } from "lucide-react";

const routes = [
  {
    label: "内容生产",
    icon: Factory,
    href: "/workbench/factory",
  },
  {
    label: "品牌监测",
    icon: Search,
    href: "/workbench/monitor",
  },
  {
    label: "任务看板",
    icon: Kanban,
    href: "/workbench/tasks",
  },
  {
    label: "品牌底座",
    icon: Database,
    href: "/workbench/brand",
  },
];

export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="hidden h-full w-64 flex-col fixed inset-y-0 z-[80] md:flex bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800">
        <div className="p-6">
          <Link href="/workbench" className="flex items-center">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">GEO工厂</h1>
          </Link>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-[#0071e3] hover:bg-[#0071e3]/90"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", pathname === route.href ? "text-white" : "text-zinc-500")} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-500">v1.0.0</span>
          <ThemeToggle />
        </div>
      </div>
      <main className="md:pl-64 flex-1">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
