"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Factory, Search, Kanban, Database, Users, LogOut, FileText, BookOpen, Cpu, Tags } from "lucide-react";

const routes = [
  { label: "工作台首页", icon: LayoutDashboard, href: "/workbench" },
  { label: "内容生产", icon: Factory, href: "/workbench/factory" },
  { label: "文章列表", icon: FileText, href: "/workbench/articles" },
  { label: "样板库", icon: BookOpen, href: "/workbench/samples" },
  { label: "关键词词库", icon: Tags, href: "/workbench/keywords" },
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

    setRole(getCookie("gf_role"));
    setUserEmail(getCookie("gf_user"));
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
      <div className="fixed inset-y-0 z-[80] hidden h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="p-6">
          <Link href="/workbench" className="flex items-center">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">GEO工厂</h1>
          </Link>
        </div>

        <div className="flex-1 space-y-2 px-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white",
                pathname === route.href ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <div className="flex flex-1 items-center">
                <route.icon className={cn("mr-3 h-5 w-5", pathname === route.href ? "text-white" : "text-zinc-500")} />
                {route.label}
              </div>
            </Link>
          ))}

          {role === "admin" && (
            <Link href="/workbench/admin/users" className={cn("group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white", pathname === "/workbench/admin/users" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : "text-zinc-500 dark:text-zinc-400")}>
              <div className="flex flex-1 items-center"><Users className={cn("mr-3 h-5 w-5", pathname === "/workbench/admin/users" ? "text-white" : "text-zinc-500")} />用户管理</div>
            </Link>
          )}

          {role === "admin" && (
            <Link href="/workbench/admin/logs" className={cn("group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white", pathname === "/workbench/admin/logs" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : "text-zinc-500 dark:text-zinc-400")}>
              <div className="flex flex-1 items-center"><FileText className={cn("mr-3 h-5 w-5", pathname === "/workbench/admin/logs" ? "text-white" : "text-zinc-500")} />操作日志</div>
            </Link>
          )}

          {role === "admin" && (
            <Link href="/workbench/admin/topics" className={cn("group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white", pathname === "/workbench/admin/topics" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : "text-zinc-500 dark:text-zinc-400")}>
              <div className="flex flex-1 items-center"><BookOpen className={cn("mr-3 h-5 w-5", pathname === "/workbench/admin/topics" ? "text-white" : "text-zinc-500")} />选题库管理</div>
            </Link>
          )}

          {(role === "admin" || role === "editor") && (
            <Link href="/workbench/models" className={cn("group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white", pathname === "/workbench/models" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : "text-zinc-500 dark:text-zinc-400")}>
              <div className="flex flex-1 items-center"><Cpu className={cn("mr-3 h-5 w-5", pathname === "/workbench/models" ? "text-white" : "text-zinc-500")} />模型管理</div>
            </Link>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-zinc-800">
          {userEmail && (
            <div className="mb-3 px-1">
              <p className="truncate text-xs text-zinc-400">{userEmail}</p>
              <p className="text-xs font-medium text-zinc-500">
                {role === "admin" ? "管理员" : role === "editor" ? "编辑" : "查看者"}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">v1.0.0</span>
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="text-zinc-400 transition hover:text-red-500" title="退出登录">
                <LogOut className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 md:pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
