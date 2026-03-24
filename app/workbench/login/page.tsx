"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.push("/workbench/brand");
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "登录失败，请重试");
      }
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">GEO工厂工作台</h1>
          <p className="text-slate-500 dark:text-zinc-400">受保护的内容，请输入访问密码</p>
        </div>
        <Card className="apple-card border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-zinc-400" />
              身份验证
            </CardTitle>
            <CardDescription>请输入管理员提供的访问密钥</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">访问密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-[12px] h-12 focus-visible:ring-[#0071e3]"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-[10px]">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white h-12 rounded-[12px] text-base font-medium shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center">
                    验证并进入 <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-zinc-400">
          &copy; 2024 GEO工厂 &bull; 南京凯基特电气有限公司
        </p>
      </div>
    </div>
  );
}
