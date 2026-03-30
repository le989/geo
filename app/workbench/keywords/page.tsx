"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Tags } from "lucide-react";

type KeywordItem = {
  id: string;
  keyword: string;
  scene: string;
  groupName: string;
  priority: string;
  status: string;
  usageCount: number;
  active: boolean;
  sourceType?: string;
  sourceLabel?: string | null;
  lastUsedAt?: string | null;
  updatedAt: string;
};

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

export default function KeywordsPage() {
  const [items, setItems] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ keyword: "", scene: "通用", groupName: "默认分组", priority: "MEDIUM" });

  const isAdmin = role === "admin";

  async function loadKeywords() {
    setLoading(true);
    try {
      const response = await fetch(`/api/keywords?all=1&search=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const match = document.cookie.match(/(?:^| )gf_role=([^;]+)/);
    setRole(match ? decodeURIComponent(match[1]) : "");
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [search]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.active).length,
      used: items.filter((item) => item.usageCount > 0).length,
    }),
    [items]
  );

  async function handleAdd() {
    if (!form.keyword.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "新增关键词失败");
      }
      setForm({ keyword: "", scene: "通用", groupName: "默认分组", priority: "MEDIUM" });
      await loadKeywords();
    } catch (error) {
      alert(error instanceof Error ? error.message : "新增关键词失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: KeywordItem) {
    const response = await fetch("/api/admin/keywords", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    if (response.ok) await loadKeywords();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除这条关键词资产？")) return;
    const response = await fetch("/api/admin/keywords", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) await loadKeywords();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">{"\u8d44\u4ea7\u5c42"}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{"\u5173\u952e\u8bcd\u8bcd\u5e93"}</h1>
            <p className="mt-2 text-sm text-slate-500">{"\u628a\u96f6\u6563\u9700\u6c42\u3001\u5386\u53f2\u751f\u6210\u4fe1\u53f7\u548c\u573a\u666f\u8bcd\u6c89\u6dc0\u6210\u53ef\u590d\u7528\u7684\u8bcd\u5e93\u8d44\u4ea7\u3002"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>{"\u603b\u5173\u952e\u8bcd\uff1a"}{stats.total}</div>
            <div>{"\u5df2\u542f\u7528\uff1a"}{stats.active}</div>
            <div>{"\u5df2\u4f7f\u7528\uff1a"}{stats.used}</div>
          </div>
        </div>

        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={"\u641c\u7d22\u5173\u952e\u8bcd\u3001\u573a\u666f\u6216\u5206\u7ec4"}
            className="h-11 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>
      </div>

      {isAdmin ? (
        <div className="grid gap-3 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-4">
          <input value={form.keyword} onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))} placeholder={"\u5173\u952e\u8bcd"} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0071e3]" />
          <input value={form.scene} onChange={(e) => setForm((prev) => ({ ...prev, scene: e.target.value }))} placeholder={"\u573a\u666f"} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0071e3]" />
          <input value={form.groupName} onChange={(e) => setForm((prev) => ({ ...prev, groupName: e.target.value }))} placeholder={"\u5206\u7ec4"} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0071e3]" />
          <div className="flex gap-3">
            <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} className="h-11 flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0071e3]">
              {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={handleAdd} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0071e3] px-4 text-sm font-medium text-white hover:bg-[#0071e3]/90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" />{"\u65b0\u589e"}</>}
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center rounded-3xl bg-white py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white py-16 text-center text-sm text-slate-400 shadow-sm">
            <Tags className="mx-auto mb-3 h-8 w-8 opacity-30" />
            {"\u6682\u65e0\u5173\u952e\u8bcd\u8d44\u4ea7"}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0071e3]">{item.scene}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.groupName}</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{item.priority}</span>
                    <span className={item.active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>{item.active ? "启用中" : "已停用"}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{item.keyword}</h3>
                  <div className="text-sm text-slate-500">{"\u4f7f\u7528\u6b21\u6570\uff1a"}{item.usageCount}{" · "}{"\u6700\u540e\u4f7f\u7528\uff1a"}{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "未使用"}</div>
                </div>
                {isAdmin ? (
                  <div className="flex gap-3">
                    <button onClick={() => handleToggle(item)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">{item.active ? "停用" : "启用"}</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm text-rose-500 hover:bg-rose-50">{"\u5220\u9664"}</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


