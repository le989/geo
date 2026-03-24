"use client";
import { useState, useEffect } from "react";

type Topic = {
  id: string;
  topic: string;
  scene: string;
  channel: string;
  priority: string;
  active: boolean;
};

const CHANNELS = ["知乎", "百家号", "今日头条", "搜狐号", "网易号"];
const SCENES = ["供应商推荐", "技术选型", "参数对比", "行业应用", "品牌传播", "自主创作"];
const PRIORITIES = ["高", "中", "低"];

export default function TopicsAdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ topic: "", scene: "供应商推荐", channel: "知乎", priority: "中" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadTopics() {
    setLoading(true);
    const res = await fetch("/api/topics");
    const data = await res.json();
    setTopics(data || []);
    setLoading(false);
  }

  useEffect(() => { loadTopics(); }, []);

  async function handleAdd() {
    setError("");
    if (!form.topic.trim()) return setError("选题内容不能为空");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "添加失败");
      setShowAdd(false);
      setForm({ topic: "", scene: "供应商推荐", channel: "知乎", priority: "中" });
      loadTopics();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除这条选题？")) return;
    await fetch("/api/admin/topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTopics();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch("/api/admin/topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    loadTopics();
  }

  const filtered = topics.filter(t =>
    !search || t.topic.includes(search) || t.scene.includes(search)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">选题库管理</h1>
          <p className="text-gray-500 text-sm mt-1">共 {topics.length} 条选题</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + 新增选题
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">新增选题</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">选题内容 *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例：工业传感器怎么选？" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">场景</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.scene} onChange={e => setForm({...form, scene: e.target.value})}>
                  {SCENES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">渠道</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.channel} onChange={e => setForm({...form, channel: e.target.value})}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">优先级</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "添加中..." : "确认添加"}
            </button>
            <button onClick={() => { setShowAdd(false); setError(""); }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input className="border rounded-lg px-3 py-2 text-sm w-64" placeholder="搜索选题..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">选题内容</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">场景</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">渠道</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">优先级</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">加载中...</td></tr>
            ) : filtered.map(topic => (
              <tr key={topic.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate font-medium">{topic.topic}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{topic.scene}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{topic.channel}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${topic.priority === "高" ? "bg-red-50 text-red-600" : topic.priority === "中" ? "bg-yellow-50 text-yellow-600" : "bg-gray-50 text-gray-500"}`}>
                    {topic.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(topic.id, topic.active)} className={`text-xs px-2 py-0.5 rounded ${topic.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {topic.active ? "启用" : "停用"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(topic.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}