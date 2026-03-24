"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Factory, Search, Kanban, Database, Users, LogOut, FileText, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

const routes = [
  { label: "内容生产", icon: Factory, href: "/workbench/factory" },
  { label: "品牌监测", icon: Search, href: "/workbench/monitor" },
  { label: "任务看板", icon: Kanban, href: "/workbench/tasks" },
  { label: "品牌底座", icon: Database, href: "/workbench/brand" },
];

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
  const getCookie = (name: string) => {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  };
  const r = getCookie("gf_role");
  const u = getCookie("gf_user");
  console.log("role:", r, "user:", u);
  setRole(r);
  setUserEmail(u);
}, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/workbench/login";
  }

  if (pathname === "/workbench/login" || pathname === "/workbench/register") {
    return <>{children}</>;
  }

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

          {role === "admin" && (
            <Link
              href="/workbench/admin/users"
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === "/workbench/admin/users"
                  ? "text-white bg-[#0071e3] hover:bg-[#0071e3]/90"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <Users className={cn("h-5 w-5 mr-3", pathname === "/workbench/admin/users" ? "text-white" : "text-zinc-500")} />
                用户管理
              </div>
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/workbench/admin/logs"
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === "/workbench/admin/logs"
                  ? "text-white bg-[#0071e3] hover:bg-[#0071e3]/90"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <FileText className={cn("h-5 w-5 mr-3", pathname === "/workbench/admin/logs" ? "text-white" : "text-zinc-500")} />
                操作日志
              </div>
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/workbench/admin/topics"
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === "/workbench/admin/topics"
                  ? "text-white bg-[#0071e3] hover:bg-[#0071e3]/90"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <BookOpen className={cn("h-5 w-5 mr-3", pathname === "/workbench/admin/topics" ? "text-white" : "text-zinc-500")} />
                选题库管理
              </div>
            </Link>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
          {userEmail && (
            <div className="mb-3 px-1">
              <p className="text-xs text-zinc-400 truncate">{userEmail}</p>
              <p className="text-xs text-zinc-500 font-medium">{role === "admin" ? "管理员" : role === "editor" ? "编辑" : "访客"}</p>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">v1.0.0</span>
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition" title="退出登录">
                <LogOut className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
      <main className="md:pl-64 flex-1">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
