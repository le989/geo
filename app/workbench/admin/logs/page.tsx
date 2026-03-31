"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type ActivityLog = {
  id: string;
  userEmail: string;
  action: string;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

export default function AdminLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/logs");
        const data = await res.json();
        setLogs(data.logs || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">操作日志</h1>
        <p className="mt-1 text-sm text-gray-500">查看系统内用户的关键操作记录，便于排查问题和追踪行为。</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-400">
          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
          正在加载日志...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="p-3 text-left font-semibold">时间</th>
                <th className="p-3 text-left font-semibold">用户邮箱</th>
                <th className="p-3 text-left font-semibold">操作</th>
                <th className="p-3 text-left font-semibold">详情</th>
                <th className="p-3 text-left font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="whitespace-nowrap p-3 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap p-3">{log.userEmail}</td>
                  <td className="whitespace-nowrap p-3 font-medium">{log.action}</td>
                  <td className="p-3 text-gray-600 dark:text-zinc-300">{log.detail || "-"}</td>
                  <td className="whitespace-nowrap p-3 text-xs text-gray-500">{log.ip || "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    暂无操作日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
