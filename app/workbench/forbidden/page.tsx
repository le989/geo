"use client";

export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-zinc-950">
      <div className="space-y-3 text-center">
        <div className="text-5xl">🚫</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">无权限访问</h1>
        <p className="text-sm text-zinc-500">当前账号没有访问此页面的权限，请联系管理员或返回登录页切换账号。</p>
        <a href="/workbench/login" className="text-sm font-medium text-[#0071e3] hover:underline">
          返回登录
        </a>
      </div>
    </div>
  );
}
