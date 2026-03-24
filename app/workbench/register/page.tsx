"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!form.name || !form.email || !form.password) return setError("所有字段必填");
    if (form.password !== form.confirm) return setError("两次密码不一致");
    if (form.password.length < 6) return setError("密码至少6位");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "注册失败");
      router.push("/workbench/login?registered=1");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">注册账号</h1>
        <p className="text-gray-500 text-sm text-center mb-6">注册后默认为 viewer 角色，管理员可升级权限</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="你的姓名" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" type="password" placeholder="至少6位" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">确认密码</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" type="password" placeholder="再输一次" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "注册中..." : "注册"}
          </button>
          <p className="text-center text-sm text-gray-500">已有账号？<a href="/workbench/login" className="text-blue-600">去登录</a></p>
        </div>
      </div>
    </div>
  );
}