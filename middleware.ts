import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 登录页放行
  if (pathname === '/workbench/login' || pathname === '/workbench/register') {
    return NextResponse.next();
  }

  // 受保护路径（工作台和相关 API）
  const protectedPaths = [
    '/workbench',
    '/api/generate',
  ];
  const needsProtect = protectedPaths.some((p) => pathname.startsWith(p));

  if (needsProtect) {
    const auth = request.cookies.get('gf_auth')?.value === 'true';
    const role = request.cookies.get('gf_role')?.value as 'admin' | 'editor' | 'viewer' | undefined;

    if (!auth || !role) {
      const loginUrl = new URL('/workbench/login', request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // 角色路由控制
    const isAdmin = role === 'admin';
    const isEditor = role === 'editor';
    const isViewer = role === 'viewer';

    // viewer 不能访问内容生产页与生成 API
    if (isViewer && (pathname.startsWith('/workbench/factory') || pathname.startsWith('/api/generate'))) {
      const loginUrl = new URL('/workbench/login', request.url);
      loginUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(loginUrl);
    }

    // admin 页面只有管理员可进
    if (pathname.startsWith('/workbench/admin') && !isAdmin) {
      const loginUrl = new URL('/workbench/login', request.url);
      loginUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  matcher: ['/workbench/:path*', '/api/generate/:path*'],
};
