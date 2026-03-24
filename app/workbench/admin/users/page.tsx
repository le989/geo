"use client";
import { useState, useEffect } from "react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleAdd() {
    setError("");
    if (!form.email || !form.password) return setError("邮箱和密码必填");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "创建失败");
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "viewer" });
      loadUsers();
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
    loadUsers();
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`确认删除用户 ${email}？`)) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理所有账号的角色与权限</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + 新增用户
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">新增用户</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">姓名</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="姓名（可选）" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">邮箱 *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">初始密码 *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" type="password" placeholder="至少6位" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">角色</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="viewer">访客 viewer</option>
                <option value="editor">编辑 editor</option>
                <option value="admin">管理员 admin</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "创建中..." : "确认创建"}
            </button>
            <button onClick={() => { setShowAdd(false); setError(""); }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              取消
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-600">姓名</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">邮箱</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">角色</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">注册时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">暂无用户</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{user.name || "-"}</td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <select
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[user.role]}`}
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="viewer">访客</option>
                    <option value="editor">编辑</option>
                    <option value="admin">管理员</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(user.id, user.email)} className="text-red-500 hover:text-red-700 text-xs">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
