"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "管理员", badge: "bg-red-100 text-red-700" },
  { value: "editor", label: "编辑", badge: "bg-blue-100 text-blue-700" },
  { value: "viewer", label: "查看者", badge: "bg-slate-100 text-slate-600" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" });

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleAdd() {
    setError("");
    if (!form.email || !form.password) {
      setError("邮箱和密码不能为空");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "新增用户失败");
        return;
      }

      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "viewer" });
      await loadUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: string, role: string) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    await loadUsers();
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`确认删除用户 ${email} 吗？`)) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadUsers();
  }

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">用户管理</h1>
          <p className="mt-1 text-sm text-slate-500">管理平台登录账号和角色权限。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((value) => !value)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showAdd ? "收起表单" : "新增用户"}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">新增用户</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">姓名</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="可选"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">邮箱 *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">密码 *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">角色</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "创建用户"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setError("");
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    正在加载用户...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleMeta = ROLE_OPTIONS.find((item) => item.value === user.role) ?? ROLE_OPTIONS[2];
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-slate-900">{user.name || "未命名"}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${roleMeta.badge}`}>{roleMeta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(user.createdAt).toLocaleString("zh-CN")}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <select
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            value={user.role}
                            onChange={(event) => void handleRoleChange(user.id, event.target.value)}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void handleDelete(user.id, user.email)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
