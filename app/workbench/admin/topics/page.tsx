"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";

type Topic = {
  id: string;
  topic: string;
  scene: string;
  channel: string;
  priority: string;
  active: boolean;
};

const CHANNELS = ["知乎", "百家号", "今日头条", "搜狐号", "网易号"];
const SCENES = ["供应商推荐类", "技术选型", "参数对比", "行业应用", "品牌传播", "自主创作"];
const PRIORITIES = ["高", "中", "低"];

export default function TopicsAdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    topic: "",
    scene: SCENES[0],
    channel: CHANNELS[0],
    priority: PRIORITIES[1],
  });

  async function loadTopics() {
    setLoading(true);
    try {
      const response = await fetch("/api/topics");
      const data = await response.json();
      setTopics(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTopics();
  }, []);

  async function handleAdd() {
    setError("");
    if (!form.topic.trim()) {
      setError("选题内容不能为空");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/logs/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "新增选题失败");
        return;
      }

      setShowAdd(false);
      setForm({
        topic: "",
        scene: SCENES[0],
        channel: CHANNELS[0],
        priority: PRIORITIES[1],
      });
      await loadTopics();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除这条选题吗？")) return;
    await fetch("/api/admin/logs/topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadTopics();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch("/api/admin/logs/topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await loadTopics();
  }

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics;
    return topics.filter((item) => item.topic.includes(search) || item.scene.includes(search) || item.channel.includes(search));
  }, [search, topics]);

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">选题库管理</h1>
          <p className="mt-1 text-sm text-slate-500">维护可用于内容生成的选题模板。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((value) => !value)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showAdd ? "收起表单" : "新增选题"}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">新增选题</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">选题内容</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.topic}
                onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
                placeholder="例如：接近开关选型指南：如何为工业应用挑选最佳方案"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">业务场景</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.scene}
                onChange={(event) => setForm((current) => ({ ...current, scene: event.target.value }))}
              >
                {SCENES.map((scene) => (
                  <option key={scene} value={scene}>
                    {scene}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">发布渠道</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">优先级</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
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
              {saving ? "保存中..." : "保存选题"}
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">已启用选题</h2>
            <p className="mt-1 text-sm text-slate-500">共 {filteredTopics.length} 条结果</p>
          </div>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索选题 / 场景 / 渠道"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">选题</th>
                <th className="px-4 py-3 font-medium">场景</th>
                <th className="px-4 py-3 font-medium">渠道</th>
                <th className="px-4 py-3 font-medium">优先级</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    正在加载选题...
                  </td>
                </tr>
              ) : filteredTopics.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    暂无选题数据
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => (
                  <tr key={topic.id}>
                    <td className="px-4 py-3 text-slate-900">{topic.topic}</td>
                    <td className="px-4 py-3 text-slate-600">{topic.scene}</td>
                    <td className="px-4 py-3 text-slate-600">{topic.channel}</td>
                    <td className="px-4 py-3 text-slate-600">{topic.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${topic.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {topic.active ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggle(topic.id, topic.active)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {topic.active ? "停用" : "启用"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(topic.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
