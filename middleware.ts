import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 检查是否是工作台路径，且不是登录页
  if (pathname.startsWith('/workbench') && pathname !== '/workbench/login') {
    const authCookie = request.cookies.get('workbench_auth');

    // 2. 如果没有验证 cookie，跳转到登录页
    if (!authCookie || authCookie.value !== 'true') {
      const loginUrl = new URL('/workbench/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  matcher: ['/workbench/:path*'],
};
