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
    load();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">鎿嶄綔鏃ュ織</h1>
        <p className="text-gray-500 text-sm mt-1">璁板綍鐧诲綍銆佹敞鍐屻€佺敤鎴风鐞嗙瓑鍏抽敭鎿嶄綔</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          鍔犺浇涓?..
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 border rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
              <tr>
                <th className="text-left p-3 font-semibold">鏃堕棿</th>
                <th className="text-left p-3 font-semibold">鐢ㄦ埛</th>
                <th className="text-left p-3 font-semibold">鍔ㄤ綔</th>
                <th className="text-left p-3 font-semibold">璇︽儏</th>
                <th className="text-left p-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 whitespace-nowrap">{log.userEmail}</td>
                  <td className="p-3 whitespace-nowrap font-medium">{log.action}</td>
                  <td className="p-3 text-gray-600 dark:text-zinc-300">{log.detail || "-"}</td>
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{log.ip || "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    鏆傛棤鏃ュ織
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



