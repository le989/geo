"use client";

export const dynamic = "force-dynamic";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/workbench");
        router.refresh();
        return;
      }

      const data = await response.json().catch(() => null);
      setError(data?.error || "登录失败，请检查邮箱和密码。");
    } catch {
      setError("登录请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-[#0071e3]/10 p-3 text-[#0071e3]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">GEO 工厂工作台</h1>
          <p className="text-slate-500 dark:text-zinc-400">登录后进入品牌内容生产与审核工作流。</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-4 w-4 text-zinc-400" />
              账号登录
            </CardTitle>
            <CardDescription>请输入你的工作邮箱和密码。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@geo-factory.com"
                  className="h-12 rounded-[12px] focus-visible:ring-[#0071e3]"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入登录密码"
                  className="h-12 rounded-[12px] focus-visible:ring-[#0071e3]"
                />
              </div>

              {error ? (
                <p className="rounded-[10px] bg-red-50 p-3 text-sm font-medium text-red-500 dark:bg-red-900/20">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="h-12 w-full rounded-[12px] border-none bg-[#0071e3] text-base font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-[#0071e3]/90"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center">
                    登录并进入工作台
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-zinc-500">
          还没有账号？
          <a href="/workbench/register" className="ml-1 font-medium text-[#0071e3] hover:underline">
            去注册
          </a>
        </p>
      </div>
    </div>
  );
}
