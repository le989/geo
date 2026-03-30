"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("所有字段都不能为空");
      return;
    }
    if (form.password !== form.confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (form.password.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "注册失败，请稍后重试");
        return;
      }
      router.push("/workbench/login?registered=1");
    } catch {
      setError("注册请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-bold">注册账号</h1>
        <p className="mb-6 text-center text-sm text-gray-500">注册后默认以查看者身份进入平台，管理员可后续调整角色。</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">姓名</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="请输入姓名"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">邮箱</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">密码</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              type="password"
              placeholder="至少 6 位"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">确认密码</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              type="password"
              placeholder="请再次输入密码"
              value={form.confirm}
              onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
            />
          </div>

          {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "注册中..." : "注册"}
          </button>

          <p className="text-center text-sm text-gray-500">
            已有账号？
            <a href="/workbench/login" className="ml-1 text-blue-600 hover:underline">
              去登录
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
